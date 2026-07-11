import "server-only";
import { DuffelApiError } from "@/lib/duffel";

// Minimal typed client for the Duffel Stays (hotels) API. Same base URL,
// auth token and Duffel-Version header as Flights — Stays is a separate
// product namespace (/stays/...) on the same account, not a separate key.
// Docs: https://duffel.com/docs/guides/getting-started-with-stays
//
// Test mode only ever returns results near a fixed test coordinate
// (-24.38, -128.32) — see https://duffel.com/docs/guides/test-hotels.
// Real-world searches correctly return nothing in test mode; that's expected,
// not a bug, and the itinerary chain falls back to the indicative estimate.

const BASE = "https://api.duffel.com";

export function duffelStaysConfigured(): boolean {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  return typeof token === "string" && token.trim().length > 0;
}

async function staysFetch<T>(
  path: string,
  opts: { method?: "GET" | "POST"; body?: unknown; timeoutMs?: number } = {}
): Promise<T> {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token) {
    throw new DuffelApiError("Duffel is not configured (set DUFFEL_ACCESS_TOKEN).", "not_configured", 0);
  }

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 20_000);

  try {
    const res = await fetch(`${BASE}${path}`, {
      method: opts.method ?? "GET",
      headers: {
        Authorization: `Bearer ${token}`,
        "Duffel-Version": "v2",
        Accept: "application/json",
        ...(opts.body ? { "Content-Type": "application/json" } : {}),
      },
      body: opts.body ? JSON.stringify({ data: opts.body }) : undefined,
      signal: controller.signal,
    });

    const json = (await res.json().catch(() => ({}))) as {
      data?: T;
      errors?: { code?: string; title?: string; message?: string }[];
    };

    if (!res.ok) {
      const err = json.errors?.[0];
      throw new DuffelApiError(
        err?.message ?? err?.title ?? `Duffel Stays request failed (${res.status})`,
        err?.code ?? "unknown_error",
        res.status
      );
    }
    if (json.data === undefined) {
      throw new DuffelApiError("Duffel Stays returned an empty response.", "empty_response", res.status);
    }
    return json.data;
  } catch (e) {
    if (e instanceof DuffelApiError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new DuffelApiError("Duffel Stays request timed out.", "timeout", 0);
    }
    throw new DuffelApiError(e instanceof Error ? e.message : "Duffel Stays request failed.", "network_error", 0);
  } finally {
    clearTimeout(timer);
  }
}

/* ─── Resource shapes (subset we consume) ───────────────────── */

interface DuffelStaysPhoto {
  url: string;
}

interface DuffelStaysLocation {
  address?: { line_one?: string; city_name?: string; region?: string; postal_code?: string; country_code?: string };
  geographic_coordinates?: { latitude: number; longitude: number };
}

export interface DuffelSearchResult {
  id: string; // srr_… — identifies THIS accommodation within THIS search
  accommodation: {
    id: string;
    name: string;
    location: DuffelStaysLocation;
    rating?: number;
    review_score?: number;
    review_count?: number;
    photos?: DuffelStaysPhoto[];
  };
  cheapest_rate_total_amount?: string;
  cheapest_rate_currency?: string;
}

interface DuffelStaysRate {
  id: string; // rat_…
  total_amount: string;
  total_currency: string;
  board_type?: string;
  payment_type: "pay_now" | "pay_at_accommodation";
  due_at_accommodation_amount?: string;
  due_at_accommodation_currency?: string;
  cancellation_timeline?: { refund_amount: string; currency: string; before: string }[];
}

interface DuffelStaysRoom {
  name: string;
  rates: DuffelStaysRate[];
}

interface DuffelStaysRatesResponse {
  accommodation: DuffelSearchResult["accommodation"];
  rooms: DuffelStaysRoom[];
}

interface DuffelStaysQuote {
  id: string; // quo_…
  rate_id: string;
  total_amount: string;
  total_currency: string;
  expires_at?: string;
}

export interface DuffelStaysBooking {
  id: string; // bok_…
  status: string;
  reference?: string;
  confirmed_at?: string;
  check_in_date: string;
  check_out_date: string;
  accommodation: { id: string; name: string };
  email: string;
  phone_number: string;
  guests: { given_name: string; family_name: string }[];
}

/* ─── Normalised search summary used by Atlas ───────────────── */

export interface StaysSearchSummary {
  searchResultId: string;
  accommodationId: string;
  name: string;
  city: string;
  address: string;
  stars: number;
  reviewScore?: number; // Duffel returns 0-10 already
  cheapestTotal?: number;
  cheapestCurrency?: string;
}

function toSearchSummary(r: DuffelSearchResult, fallbackCity: string): StaysSearchSummary {
  return {
    searchResultId: r.id,
    accommodationId: r.accommodation.id,
    name: r.accommodation.name,
    city: r.accommodation.location.address?.city_name ?? fallbackCity,
    address: r.accommodation.location.address?.line_one ?? "",
    stars: r.accommodation.rating ?? 0,
    reviewScore: r.accommodation.review_score,
    cheapestTotal: r.cheapest_rate_total_amount ? parseFloat(r.cheapest_rate_total_amount) : undefined,
    cheapestCurrency: r.cheapest_rate_currency,
  };
}

export interface StaysSearchParams {
  latitude: number;
  longitude: number;
  radiusKm?: number;
  checkInDate: string; // YYYY-MM-DD
  checkOutDate: string;
  adults: number;
  city: string; // for display fallback only
}

export async function searchDuffelStays(params: StaysSearchParams): Promise<StaysSearchSummary[]> {
  const results = await staysFetch<DuffelSearchResult[]>("/stays/search", {
    method: "POST",
    body: {
      rooms: 1,
      location: {
        radius: params.radiusKm ?? 8,
        geographic_coordinates: { latitude: params.latitude, longitude: params.longitude },
      },
      check_in_date: params.checkInDate,
      check_out_date: params.checkOutDate,
      guests: Array.from({ length: params.adults }, () => ({ type: "adult" })),
    },
    timeoutMs: 25_000,
  });
  return results.map((r) => toSearchSummary(r, params.city));
}

/** Re-searches for a single known accommodation, to get a fresh search_result_id at checkout time. */
export async function searchDuffelStaysByAccommodation(params: {
  accommodationId: string;
  checkInDate: string;
  checkOutDate: string;
  adults: number;
  city: string;
}): Promise<StaysSearchSummary | null> {
  const results = await staysFetch<DuffelSearchResult[]>("/stays/search", {
    method: "POST",
    body: {
      rooms: 1,
      accommodation: { ids: [params.accommodationId] },
      check_in_date: params.checkInDate,
      check_out_date: params.checkOutDate,
      guests: Array.from({ length: params.adults }, () => ({ type: "adult" })),
    },
    timeoutMs: 25_000,
  });
  const match = results.find((r) => r.accommodation.id === params.accommodationId) ?? results[0];
  return match ? toSearchSummary(match, params.city) : null;
}

export interface StaysRateSummary {
  rateId: string;
  roomName: string;
  totalAmount: number;
  totalAmountRaw: string;
  totalCurrency: string;
  boardType?: string;
  payAtAccommodation: boolean;
  freeCancellationBefore?: string;
}

export async function fetchDuffelStaysRates(searchResultId: string): Promise<{
  accommodationName: string;
  rates: StaysRateSummary[];
}> {
  const res = await staysFetch<DuffelStaysRatesResponse>(
    `/stays/search_results/${encodeURIComponent(searchResultId)}/actions/fetch_all_rates`,
    { method: "POST", timeoutMs: 25_000 }
  );

  const rates: StaysRateSummary[] = res.rooms.flatMap((room) =>
    room.rates.map((r) => ({
      rateId: r.id,
      roomName: room.name,
      totalAmount: parseFloat(r.total_amount),
      totalAmountRaw: r.total_amount,
      totalCurrency: r.total_currency,
      boardType: r.board_type,
      payAtAccommodation: r.payment_type === "pay_at_accommodation",
      freeCancellationBefore: r.cancellation_timeline?.find((c) => parseFloat(c.refund_amount) > 0)?.before,
    }))
  );

  return { accommodationName: res.accommodation.name, rates };
}

export async function createDuffelStaysQuote(rateId: string): Promise<DuffelStaysQuote> {
  return staysFetch<DuffelStaysQuote>("/stays/quotes", {
    method: "POST",
    body: { rate_id: rateId },
    timeoutMs: 20_000,
  });
}

export async function createDuffelStaysBooking(input: {
  quoteId: string;
  email: string;
  phoneNumber: string;
  guests: { given_name: string; family_name: string }[];
  specialRequests?: string;
}): Promise<DuffelStaysBooking> {
  return staysFetch<DuffelStaysBooking>("/stays/bookings", {
    method: "POST",
    body: {
      quote_id: input.quoteId,
      email: input.email,
      phone_number: input.phoneNumber,
      guests: input.guests,
      ...(input.specialRequests ? { accommodation_special_requests: input.specialRequests } : {}),
    },
    timeoutMs: 60_000,
  });
}
