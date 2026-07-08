import "server-only";
import type { FlightDetail } from "@/lib/types";
import type { FlightOffer } from "@/lib/providers/amadeus";
import { bookingFlightLink, type HotelOption } from "@/lib/providers/booking";
import { cached, cacheGet, cacheSet } from "@/lib/cache";
import { ProviderResult, isConfigured } from "./types";

// Booking.com (and flights) via the RapidAPI "booking-com15" provider — a single
// key unlocks real hotel and flight data with no partner-approval gate.
const HOST = "booking-com15.p.rapidapi.com";

function headers() {
  return {
    "x-rapidapi-host": HOST,
    "x-rapidapi-key": process.env.RAPIDAPI_KEY ?? "",
  };
}

function configured(): boolean {
  return isConfigured(process.env.RAPIDAPI_KEY);
}

// Fail fast instead of hanging — the provider can be slow or return a challenge.
async function getJson(url: string, timeoutMs = 20000): Promise<Record<string, unknown>> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), timeoutMs);
  try {
    const res = await fetch(url, { headers: headers(), signal: ctrl.signal });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(t);
  }
}

function pad(n: number) {
  return String(n).padStart(2, "0");
}
function timeOf(iso: string) {
  return iso.slice(11, 16);
}
function dateOf(iso: string) {
  return iso.slice(0, 10);
}
function humanFromSeconds(s: number) {
  const h = Math.floor(s / 3600);
  const m = Math.round((s % 3600) / 60);
  return `${h}h ${pad(m)}m`;
}

/* ─── Flights ──────────────────────────────────────────────── */

type RapidLeg = {
  departureTime: string;
  arrivalTime: string;
  departureAirport: { code: string };
  arrivalAirport: { code: string };
  flightInfo?: { flightNumber?: number };
  carriersData?: { name: string; code: string }[];
};
type RapidSegment = {
  departureAirport: { code: string };
  arrivalAirport: { code: string };
  departureTime: string;
  arrivalTime: string;
  totalTime: number; // seconds
  legs: RapidLeg[];
};

function segmentToFlight(seg: RapidSegment, isReturn: boolean, price: number, link: string): FlightDetail {
  const legs = seg.legs ?? [];
  const firstCarrier = legs[0]?.carriersData?.[0];
  const layovers = legs.slice(0, -1).map((lg, i) => {
    const next = legs[i + 1];
    const waitMs = new Date(next.departureTime).getTime() - new Date(lg.arrivalTime).getTime();
    return {
      airport: lg.arrivalAirport.code,
      duration: humanFromSeconds(Math.max(0, Math.round(waitMs / 1000))),
    };
  });
  return {
    airline: firstCarrier?.name ?? "Airline",
    flightNumber: firstCarrier ? `${firstCarrier.code}${legs[0]?.flightInfo?.flightNumber ?? ""}` : "",
    departure: { airport: seg.departureAirport.code, time: timeOf(seg.departureTime), date: dateOf(seg.departureTime) },
    arrival: { airport: seg.arrivalAirport.code, time: timeOf(seg.arrivalTime), date: dateOf(seg.arrivalTime) },
    layovers,
    duration: humanFromSeconds(seg.totalTime),
    price: Math.round(price),
    isReturn,
    bookingLink: link,
  };
}

export async function rapidFlights(params: {
  origin: string; // IATA
  destination: string; // IATA
  departureDate: string;
  returnDate?: string;
  adults: number;
  cabinClass: "economy" | "business" | "first";
  currency: string;
}): Promise<ProviderResult<FlightOffer[]>> {
  if (!configured()) return { ok: false, error: "RapidAPI not configured (set RAPIDAPI_KEY)." };

  const cacheKey = `rapid:flights:${JSON.stringify(params)}`;
  const hit = cacheGet<FlightOffer[]>(cacheKey);
  if (hit) return { ok: true, data: hit };
  try {
    {
      const qs = new URLSearchParams({
        fromId: `${params.origin}.AIRPORT`,
        toId: `${params.destination}.AIRPORT`,
        departDate: params.departureDate,
        cabinClass: params.cabinClass.toUpperCase(),
        adults: String(params.adults),
        sort: "BEST",
        currency_code: params.currency,
        pageNo: "1",
      });
      if (params.returnDate) qs.set("returnDate", params.returnDate);

      const url = `https://${HOST}/api/v1/flights/searchFlights?${qs.toString()}`;
      // Real responses arrive in ~2-3s; cap short so a hung/rate-limited call
      // drops to the estimate fallback quickly instead of stalling the page.
      const json = await getJson(url, 12000);
      // The provider returns an HTML challenge page (a string) when rate-limited;
      // bail fast to the estimate fallback rather than retrying a hard limit.
      const data = json.data as { flightOffers?: unknown } | string | undefined;
      if (typeof data !== "object" || data === null || !Array.isArray(data.flightOffers)) {
        return { ok: false as const, error: "Flights API returned no data (challenge/rate limit)." };
      }

      const offers = (data.flightOffers ?? []) as {
        token?: string;
        segments: RapidSegment[];
        priceBreakdown?: { total?: { units?: number; nanos?: number; currencyCode?: string } };
      }[];

      const searchLink = bookingFlightLink({
        origin: params.origin,
        destination: params.destination,
        departureDate: params.departureDate,
        returnDate: params.returnDate,
        adults: params.adults,
        cabinClass: params.cabinClass,
      });
      const aid = process.env.BOOKING_AFFILIATE_ID;

      const mapped: FlightOffer[] = offers.slice(0, 15).map((o) => {
        // Each offer carries a Booking.com token — deep-link straight to THAT
        // flight's checkout (passenger details → pay) instead of a search page.
        const deepQs = new URLSearchParams({
          type: params.returnDate ? "ROUNDTRIP" : "ONEWAY",
          adults: String(params.adults),
          cabinClass: params.cabinClass.toUpperCase(),
          depart: params.departureDate,
        });
        if (params.returnDate) deepQs.set("return", params.returnDate);
        if (aid) deepQs.set("aid", aid);
        const link = o.token
          ? `https://flights.booking.com/flights/${params.origin}.AIRPORT-${params.destination}.AIRPORT/${o.token}/?${deepQs.toString()}`
          : searchLink;

        const total = (o.priceBreakdown?.total?.units ?? 0) + (o.priceBreakdown?.total?.nanos ?? 0) / 1e9;
        const segs = o.segments ?? [];
        const flights = segs.map((s, i) => segmentToFlight(s, i > 0, total / Math.max(1, segs.length), link));
        const codes = Array.from(
          new Set(segs.flatMap((s) => s.legs.flatMap((l) => (l.carriersData ?? []).map((c) => c.code))))
        );
        const names = Array.from(
          new Set(segs.flatMap((s) => s.legs.flatMap((l) => (l.carriersData ?? []).map((c) => c.name))))
        );
        const durationMinutes = Math.round(segs.reduce((sum, s) => sum + (s.totalTime ?? 0), 0) / 60);
        return {
          flights,
          price: Math.round(total),
          currency: o.priceBreakdown?.total?.currencyCode ?? params.currency,
          airlines: names.length ? names : ["Airline"],
          airlineCodes: codes,
          refundable: false,
          durationMinutes,
          bookingLink: link,
        };
      });

      if (mapped.length === 0) return { ok: false as const, error: "No flights found for that route/date." };
      cacheSet(cacheKey, mapped, 10 * 60 * 1000); // cache successes only
      return { ok: true as const, data: mapped };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "RapidAPI flight request failed." };
  }
}

/* ─── Hotels ───────────────────────────────────────────────── */

async function destId(city: string): Promise<{ destId: string; searchType: string } | null> {
  return cached(`rapid:dest:${city.toLowerCase()}`, 60 * 60 * 1000, async () => {
    const json = await getJson(
      `https://${HOST}/api/v1/hotels/searchDestination?query=${encodeURIComponent(city)}`
    ).catch(() => null);
    const arr = (json?.data ?? []) as { dest_id: string; search_type: string }[];
    if (!Array.isArray(arr)) return null;
    const cityEntry = arr.find((d) => d.search_type?.toLowerCase() === "city") ?? arr[0];
    return cityEntry ? { destId: cityEntry.dest_id, searchType: cityEntry.search_type.toUpperCase() } : null;
  });
}

export async function rapidHotels(params: {
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  stars: number;
  currency: string;
  nights: number;
}): Promise<ProviderResult<HotelOption[]>> {
  if (!configured()) return { ok: false, error: "RapidAPI not configured (set RAPIDAPI_KEY)." };

  const cacheKey = `rapid:hotels:${JSON.stringify(params)}`;
  const hit = cacheGet<HotelOption[]>(cacheKey);
  if (hit) return { ok: true, data: hit };
  try {
    {
      const dest = await destId(params.city);
      if (!dest) return { ok: false as const, error: `Couldn't resolve destination "${params.city}".` };

      const aid = process.env.BOOKING_AFFILIATE_ID;
      const minStars = Math.max(3, params.stars || 4);
      // Star-class filter at the query level (class::4,class::5 etc.) so the API
      // returns hotels at or above the requested rating.
      const classFilter = Array.from({ length: 5 - minStars + 1 }, (_, i) => `class::${minStars + i}`).join(",");
      const qs = new URLSearchParams({
        dest_id: dest.destId,
        search_type: dest.searchType,
        arrival_date: params.checkIn,
        departure_date: params.checkOut,
        adults: String(params.adults),
        room_qty: "1",
        page_number: "1",
        currency_code: params.currency,
        units: "metric",
        sort_by: "class_descending",
        categories_filter_ids: classFilter,
      });
      const json = await getJson(`https://${HOST}/api/v1/hotels/searchHotels?${qs.toString()}`);
      const data = json.data as { hotels?: unknown } | string | undefined;
      if (typeof data !== "object" || data === null || !Array.isArray(data.hotels)) {
        return { ok: false as const, error: "Hotels API returned no data (challenge/rate limit)." };
      }
      const nights = params.nights || 1;
      // Exclude non-hotel property types (executives don't want hostels/B&Bs).
      const EXCLUDE = /hostel|backpacker|guest\s*house|guesthouse|bed (and|&) breakfast|\bb&b\b|dormitory|campsite|caravan|motel/i;
      const rows = (data.hotels ?? [])
        .filter((r: { property?: { name?: unknown } }) => !EXCLUDE.test(String(r.property?.name ?? "")))
        .slice(0, 15) as { hotel_id?: number; property: Record<string, unknown> }[];

      const hotels: HotelOption[] = rows.map(({ hotel_id, property: p }) => {
        const price = Number(
          ((p.priceBreakdown as { grossPrice?: { value?: number } } | undefined)?.grossPrice?.value) ?? 0
        );
        const stars = Number((p.accuratePropertyClass as number) || (p.propertyClass as number) || params.stars);
        const name = String(p.name ?? "Hotel");
        // Deep-link into Booking.com's checkout for THIS hotel, dates and room
        // pre-selected — the guest just enters their details and pays. Falls
        // back to a pre-filled hotel search if we lack a hotel_id.
        const blockIds = (p.blockIds as string[] | undefined) ?? [];
        let bookingLink: string;
        if (hotel_id) {
          const bookQs = new URLSearchParams({
            hotel_id: String(hotel_id),
            checkin: params.checkIn,
            checkout: params.checkOut,
            group_adults: String(params.adults),
            group_children: "0",
            no_rooms: "1",
          });
          if (blockIds[0]) bookQs.set(`nr_rooms_${blockIds[0]}`, "1");
          if (aid) bookQs.set("aid", aid);
          bookingLink = `https://secure.booking.com/book.html?${bookQs.toString()}`;
        } else {
          bookingLink = `https://www.booking.com/searchresults.html?${new URLSearchParams({
            ss: name,
            checkin: params.checkIn,
            checkout: params.checkOut,
            group_adults: String(params.adults),
            ...(aid ? { aid } : {}),
          }).toString()}`;
        }
        return {
          name,
          location: params.city,
          address: "",
          stars,
          nightlyRate: Math.round(price / nights),
          totalCost: Math.round(price),
          amenities: [],
          rating: Number(p.reviewScore as number) || undefined,
          cancellationPolicy: "Check cancellation terms on Booking.com",
          bookingLink,
        };
      });

      if (hotels.length === 0) return { ok: false as const, error: "No hotels found for that destination/date." };
      cacheSet(cacheKey, hotels, 10 * 60 * 1000); // cache successes only
      return { ok: true as const, data: hotels };
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "RapidAPI hotel request failed." };
  }
}
