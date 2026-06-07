import "server-only";
import type { FlightDetail } from "@/lib/types";
import type { FlightOffer } from "@/lib/providers/amadeus";
import { AIRLINES } from "@/lib/airlines";
import { cacheGet, cacheSet } from "@/lib/cache";
import type { ProviderResult } from "@/lib/providers/types";
import { newPage, delay } from "./browser";

const AIRLINE_BY_NAME = new Map(AIRLINES.map((a) => [a.name.toLowerCase(), a]));

function googleFlightsUrl(p: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  cabinClass: string;
  currency: string;
}): string {
  const trip = p.returnDate
    ? `from ${p.origin} to ${p.destination} on ${p.departureDate} returning ${p.returnDate}`
    : `one way from ${p.origin} to ${p.destination} on ${p.departureDate}`;
  return `https://www.google.com/travel/flights?q=${encodeURIComponent(
    `Flights ${trip} ${p.cabinClass} class`
  )}&hl=en&curr=${p.currency}`;
}

/** Best-effort scrape of Google Flights. Returns [] / error when blocked. */
export async function scrapeFlights(params: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  cabinClass: "economy" | "business" | "first";
  currency: string;
}): Promise<ProviderResult<FlightOffer[]>> {
  const cacheKey = `scrape:flights:${JSON.stringify(params)}`;
  const hit = cacheGet<FlightOffer[]>(cacheKey);
  if (hit) return { ok: true, data: hit };

  try {
    const page = await newPage();
    try {
      await page.goto(googleFlightsUrl(params), { waitUntil: "networkidle2", timeout: 30000 });
      await delay(2500);

      // Each result row exposes a verbose aria-label with all the details.
      const labels: string[] = await page.evaluate(() => {
        const nodes = Array.from(
          document.querySelectorAll('li[aria-label], [role="listitem"][aria-label]')
        );
        return nodes
          .map((n) => n.getAttribute("aria-label") || "")
          .filter((t) => /flight/i.test(t) && /\d/.test(t));
      });

      const offers: FlightOffer[] = [];
      for (const label of labels.slice(0, 10)) {
        const offer = parseLabel(label, params);
        if (offer) offers.push(offer);
      }

      if (offers.length === 0) {
        return { ok: false, error: "No flight results scraped (likely blocked or layout changed)." };
      }
      cacheSet(cacheKey, offers, 15 * 60 * 1000); // cache successes only
      return { ok: true, data: offers };
    } finally {
      await page.close().catch(() => {});
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Flight scrape failed." };
  }
}

function parseTimeTo24h(t: string): string {
  const m = t.match(/(\d{1,2}):(\d{2})\s*(AM|PM)?/i);
  if (!m) return "";
  let h = parseInt(m[1]);
  const min = m[2];
  const ap = m[3]?.toUpperCase();
  if (ap === "PM" && h < 12) h += 12;
  if (ap === "AM" && h === 12) h = 0;
  return `${String(h).padStart(2, "0")}:${min}`;
}

function parseLabel(label: string, params: { origin: string; destination: string; departureDate: string; currency: string }): FlightOffer | null {
  const priceMatch = label.match(/(\d[\d,]{1,7})\s*(?:US dollars|dollars|USD|\$)/i);
  const price = priceMatch ? parseInt(priceMatch[1].replace(/,/g, "")) : NaN;
  if (!Number.isFinite(price)) return null;

  const airlineMatch = label.match(/(?:with|on|by)\s+([A-Z][A-Za-z .'-]+?)(?:\.|,| flight)/);
  const airlineName = airlineMatch ? airlineMatch[1].trim() : "Airline";
  const known = AIRLINE_BY_NAME.get(airlineName.toLowerCase());

  const times = Array.from(label.matchAll(/(\d{1,2}:\d{2}\s*(?:AM|PM)?)/gi)).map((m) => m[1]);
  const dep = times[0] ? parseTimeTo24h(times[0]) : "";
  const arr = times[1] ? parseTimeTo24h(times[1]) : "";

  const stopsMatch = label.match(/(\d+)\s*stop/i);
  const stops = /nonstop|direct/i.test(label) ? 0 : stopsMatch ? parseInt(stopsMatch[1]) : 0;

  const durMatch = label.match(/(\d+)\s*hr(?:\s*(\d+)\s*min)?/i);
  const duration = durMatch ? `${durMatch[1]}h ${(durMatch[2] ?? "0").padStart(2, "0")}m` : "";

  const flight: FlightDetail = {
    airline: known?.name ?? airlineName,
    flightNumber: known ? `${known.code}` : "",
    departure: { airport: params.origin, time: dep, date: params.departureDate },
    arrival: { airport: params.destination, time: arr, date: params.departureDate },
    layovers: Array.from({ length: stops }, () => ({ airport: "—", duration: "" })),
    duration,
    price,
    isReturn: false,
    bookingLink: `https://www.google.com/travel/flights?q=${encodeURIComponent(
      `Flights from ${params.origin} to ${params.destination} on ${params.departureDate}`
    )}`,
  };

  const durationMinutes = durMatch ? parseInt(durMatch[1]) * 60 + parseInt(durMatch[2] ?? "0") : 0;
  return {
    flights: [flight],
    price,
    currency: params.currency,
    airlines: [flight.airline],
    airlineCodes: known ? [known.code] : [],
    refundable: /refundable|free cancellation/i.test(label),
    durationMinutes,
    bookingLink: flight.bookingLink!,
  };
}
