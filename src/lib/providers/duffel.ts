import "server-only";
import type { FlightOffer } from "@/lib/providers/amadeus";
import type { CabinClass } from "@/lib/types";
import { cacheGet, cacheSet } from "@/lib/cache";
import { ProviderResult, isConfigured } from "./types";
import { searchDuffelOffers, duffelLiveMode, DuffelApiError } from "@/lib/duffel";

/**
 * Duffel as a flight-price source for the trip-planner chain.
 *
 * Unlike the other providers these fares are bookable inside Atlas — the
 * bookingLink points at the standalone /flights flow (pre-filled) where a
 * fresh offer is fetched and ordered, rather than at an external site.
 *
 * In the plan chain we only use Duffel when the token is live (or when
 * DUFFEL_IN_PLANS=true for testing): test-mode offers are Duffel Airways
 * fakes with unrealistic prices, which would pollute plan quality.
 */
export function duffelPlanSearchEnabled(): boolean {
  // Use Duffel for the plan's flights whenever it's configured, so the flights
  // shown on the itinerary are the exact live fares the traveller will book —
  // no mismatch between the choosing screen and the booking screen.
  return isConfigured(process.env.DUFFEL_ACCESS_TOKEN);
}

export async function duffelFlights(params: {
  origin: string; // IATA
  destination: string; // IATA
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  cabinClass: CabinClass;
  currency: string;
  directOnly?: boolean; // when true, only non-stop offers
}): Promise<ProviderResult<FlightOffer[]>> {
  if (!isConfigured(process.env.DUFFEL_ACCESS_TOKEN)) {
    return { ok: false, error: "Duffel not configured (set DUFFEL_ACCESS_TOKEN)." };
  }

  const cacheKey = `duffel:flights:${JSON.stringify(params)}`;
  const hit = cacheGet<FlightOffer[]>(cacheKey);
  if (hit) return { ok: true, data: hit };

  try {
    const summaries = await searchDuffelOffers({
      origin: params.origin,
      destination: params.destination,
      departureDate: params.departureDate,
      returnDate: params.returnDate,
      adults: params.adults,
      children: params.children ?? 0,
      cabinClass: params.cabinClass,
      maxConnections: params.directOnly ? 0 : 1,
      displayCurrency: params.currency,
    });

    const flightsLink = (() => {
      const qs = new URLSearchParams({
        origin: params.origin,
        destination: params.destination,
        depart: params.departureDate,
        adults: String(params.adults),
        cabin: params.cabinClass,
      });
      if (params.children) qs.set("children", String(params.children));
      if (params.returnDate) qs.set("return", params.returnDate);
      return `/flights?${qs.toString()}`;
    })();

    // Show every live offer, priced in the traveller's selected currency (Duffel
    // has no currency request param, so we convert its price for display). These
    // are the exact fares the booking screen will re-fetch, so they correlate.
    const result: FlightOffer[] = summaries.map((s) => {
      const flights = s.flights.map((f) => ({ ...f, bookingLink: flightsLink }));
      return {
        flights,
        price: Math.round(s.displayAmount),
        currency: s.displayCurrency,
        airlines: [s.airlineName],
        airlineCodes: [s.airlineCode],
        refundable: s.refundable,
        durationMinutes: s.durationMinutes,
        bookingLink: flightsLink,
      };
    });

    if (result.length === 0) {
      return { ok: false, error: "No Duffel offers for this route/date in the trip currency." };
    }

    cacheSet(cacheKey, result, 10 * 60 * 1000);
    return { ok: true, data: result };
  } catch (err) {
    const msg =
      err instanceof DuffelApiError
        ? `Duffel search failed (${err.code}): ${err.message}`
        : err instanceof Error
          ? err.message
          : "Duffel request failed.";
    return { ok: false, error: msg };
  }
}
