import "server-only";
import { FlightDetail } from "@/lib/types";
import { AIRLINES } from "@/lib/airlines";
import { cached, cacheGet, cacheSet } from "@/lib/cache";
import { ProviderResult, isConfigured } from "./types";

const BASE = "https://test.api.amadeus.com";

export interface FlightOffer {
  flights: FlightDetail[]; // outbound (+ return if round trip)
  price: number;
  currency: string;
  airlines: string[]; // airline names
  airlineCodes: string[];
  refundable: boolean;
  durationMinutes: number; // total journey duration
  bookingLink: string;
}

const AIRLINE_BY_CODE = new Map(AIRLINES.map((a) => [a.code, a.name]));

function airlineName(code: string): string {
  return AIRLINE_BY_CODE.get(code) ?? code;
}

function parseIsoDuration(iso: string): number {
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?/);
  if (!m) return 0;
  return (parseInt(m[1] ?? "0") * 60) + parseInt(m[2] ?? "0");
}

function humanDuration(mins: number): string {
  const h = Math.floor(mins / 60);
  const m = mins % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

function timeOf(iso: string): string {
  // "2026-06-10T08:00:00" → "08:00"
  return iso.slice(11, 16);
}
function dateOf(iso: string): string {
  return iso.slice(0, 10);
}

async function getToken(key: string, secret: string): Promise<string> {
  const cacheKey = "amadeus:token";
  const cached = cacheGet<string>(cacheKey);
  if (cached) return cached;

  const res = await fetch(`${BASE}/v1/security/oauth2/token`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "client_credentials",
      client_id: key,
      client_secret: secret,
    }),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Amadeus auth failed (${res.status}): ${text.slice(0, 160)}`);
  }
  const json = await res.json();
  const token = json.access_token as string;
  // Token lasts ~30 min; cache slightly less.
  cacheSet(cacheKey, token, ((json.expires_in ?? 1800) - 60) * 1000);
  return token;
}

type SegmentJson = {
  departure: { iataCode: string; at: string };
  arrival: { iataCode: string; at: string };
  carrierCode: string;
  number: string;
  duration?: string;
};

function buildFlights(itinerary: { segments: SegmentJson[]; duration?: string }, price: number, isReturn: boolean): FlightDetail {
  const segs = itinerary.segments;
  const first = segs[0];
  const last = segs[segs.length - 1];
  const layovers = segs.slice(0, -1).map((s, i) => {
    const next = segs[i + 1];
    const wait = new Date(next.departure.at).getTime() - new Date(s.arrival.at).getTime();
    return { airport: s.arrival.iataCode, duration: humanDuration(Math.max(0, Math.round(wait / 60000))) };
  });
  const totalMins = itinerary.duration
    ? parseIsoDuration(itinerary.duration)
    : Math.round((new Date(last.arrival.at).getTime() - new Date(first.departure.at).getTime()) / 60000);

  return {
    airline: airlineName(first.carrierCode),
    flightNumber: `${first.carrierCode}${first.number}`,
    departure: { airport: first.departure.iataCode, time: timeOf(first.departure.at), date: dateOf(first.departure.at) },
    arrival: { airport: last.arrival.iataCode, time: timeOf(last.arrival.at), date: dateOf(last.arrival.at) },
    layovers,
    duration: humanDuration(totalMins),
    price: Math.round(price),
    isReturn,
  };
}

export async function searchFlights(params: {
  origin: string; // IATA
  destination: string; // IATA
  departureDate: string;
  returnDate?: string;
  adults: number;
  cabinClass: "economy" | "business" | "first";
  currency: string;
}): Promise<ProviderResult<FlightOffer[]>> {
  const key = process.env.AMADEUS_API_KEY;
  const secret = process.env.AMADEUS_API_SECRET;
  if (!isConfigured(key, secret)) {
    return { ok: false, error: "Amadeus API not configured (set AMADEUS_API_KEY / AMADEUS_API_SECRET)." };
  }

  const cacheKey = `amadeus:flights:${JSON.stringify(params)}`;

  try {
    return await cached(cacheKey, 10 * 60 * 1000, async () => {
      const token = await getToken(key!, secret!);
      const qs = new URLSearchParams({
        originLocationCode: params.origin,
        destinationLocationCode: params.destination,
        departureDate: params.departureDate,
        adults: String(params.adults),
        travelClass: params.cabinClass.toUpperCase(),
        currencyCode: params.currency,
        max: "20",
      });
      if (params.returnDate) qs.set("returnDate", params.returnDate);

      const res = await fetch(`${BASE}/v2/shopping/flight-offers?${qs.toString()}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Amadeus flight search failed (${res.status}): ${text.slice(0, 200)}`);
      }
      const json = await res.json();
      const offers = Array.isArray(json.data) ? json.data : [];

      const googleLink = `https://www.google.com/travel/flights?q=${encodeURIComponent(
        `Flights from ${params.origin} to ${params.destination} on ${params.departureDate}`
      )}`;

      const result: FlightOffer[] = offers.map((offer: Record<string, unknown>) => {
        const price = parseFloat((offer.price as { total: string }).total);
        const itineraries = offer.itineraries as { segments: SegmentJson[]; duration?: string }[];
        const flights: FlightDetail[] = itineraries.map((it, idx) =>
          buildFlights(it, price / itineraries.length, idx > 0)
        );
        flights.forEach((f) => (f.bookingLink = googleLink));

        const codes = Array.from(
          new Set(itineraries.flatMap((it) => it.segments.map((s) => s.carrierCode)))
        );
        const totalMins = itineraries.reduce(
          (sum, it) => sum + (it.duration ? parseIsoDuration(it.duration) : 0),
          0
        );
        const refundable = Boolean(
          (offer.pricingOptions as { refundableFare?: boolean } | undefined)?.refundableFare
        );

        return {
          flights,
          price: Math.round(price),
          currency: (offer.price as { currency: string }).currency ?? params.currency,
          airlines: codes.map(airlineName),
          airlineCodes: codes,
          refundable,
          durationMinutes: totalMins,
          bookingLink: googleLink,
        };
      });

      return { ok: true as const, data: result };
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Amadeus request failed." };
  }
}
