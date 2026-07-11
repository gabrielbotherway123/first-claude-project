import "server-only";
import type { FlightDetail } from "@/lib/types";

// Minimal typed client for the Duffel flights API (v2).
// Docs: https://duffel.com/docs — every request/response body is wrapped in
// a top-level `data` key, amounts are strings, and offers expire quickly.

const BASE = "https://api.duffel.com";

export function duffelConfigured(): boolean {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  return typeof token === "string" && token.trim().length > 0;
}

/** True when the configured token books real tickets for real money. */
export function duffelLiveMode(): boolean {
  return (process.env.DUFFEL_ACCESS_TOKEN ?? "").startsWith("duffel_live_");
}

export class DuffelApiError extends Error {
  readonly code: string;
  readonly status: number;

  constructor(message: string, code: string, status: number) {
    super(message);
    this.name = "DuffelApiError";
    this.code = code;
    this.status = status;
  }
}

type DuffelErrorBody = {
  errors?: { code?: string; title?: string; message?: string }[];
};

async function duffelFetch<T>(
  path: string,
  opts: {
    method?: "GET" | "POST";
    body?: unknown;
    query?: Record<string, string>;
    timeoutMs?: number;
  } = {}
): Promise<T> {
  const token = process.env.DUFFEL_ACCESS_TOKEN;
  if (!token) {
    throw new DuffelApiError("Duffel is not configured (set DUFFEL_ACCESS_TOKEN).", "not_configured", 0);
  }

  const qs = opts.query ? `?${new URLSearchParams(opts.query)}` : "";
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 30_000);

  try {
    const res = await fetch(`${BASE}${path}${qs}`, {
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

    const json = (await res.json().catch(() => ({}))) as { data?: T } & DuffelErrorBody;

    if (!res.ok) {
      const err = json.errors?.[0];
      throw new DuffelApiError(
        err?.message ?? err?.title ?? `Duffel request failed (${res.status})`,
        err?.code ?? "unknown_error",
        res.status
      );
    }
    if (json.data === undefined) {
      throw new DuffelApiError("Duffel returned an empty response.", "empty_response", res.status);
    }
    return json.data;
  } catch (e) {
    if (e instanceof DuffelApiError) throw e;
    if (e instanceof Error && e.name === "AbortError") {
      throw new DuffelApiError("Duffel request timed out.", "timeout", 0);
    }
    throw new DuffelApiError(e instanceof Error ? e.message : "Duffel request failed.", "network_error", 0);
  } finally {
    clearTimeout(timer);
  }
}

/* ─── Duffel resource shapes (subset we consume) ────────────── */

interface DuffelPlace {
  iata_code: string;
  name?: string;
  city_name?: string;
}

interface DuffelSegment {
  origin: DuffelPlace;
  destination: DuffelPlace;
  departing_at: string; // ISO datetime, local to the airport
  arriving_at: string;
  duration?: string; // ISO 8601, e.g. "PT7H5M"
  marketing_carrier: { iata_code: string; name: string };
  marketing_carrier_flight_number: string;
}

interface DuffelSlice {
  origin: DuffelPlace;
  destination: DuffelPlace;
  duration?: string;
  segments: DuffelSegment[];
}

interface DuffelOffer {
  id: string;
  total_amount: string;
  total_currency: string;
  expires_at: string;
  live_mode: boolean;
  owner: { iata_code: string; name: string; logo_symbol_url?: string };
  slices: DuffelSlice[];
  passengers: { id: string; type?: string }[];
  conditions?: {
    refund_before_departure?: { allowed: boolean } | null;
    change_before_departure?: { allowed: boolean } | null;
  };
}

interface DuffelOfferRequest {
  id: string;
  passengers: { id: string; type?: string }[];
}

export interface DuffelOrder {
  id: string;
  booking_reference: string;
  live_mode: boolean;
  total_amount: string;
  total_currency: string;
  owner: { iata_code: string; name: string };
  slices: DuffelSlice[];
  passengers: {
    id: string;
    given_name: string;
    family_name: string;
    title?: string;
  }[];
}

/* ─── Normalised offer summary used by Atlas ────────────────── */

export interface DuffelOfferSummary {
  offerId: string;
  expiresAt: string;
  totalAmount: number;
  /** Unmodified total_amount string from Duffel — pass this, not totalAmount, into payments. */
  totalAmountRaw: string;
  totalCurrency: string;
  airlineName: string;
  airlineCode: string;
  airlineLogo?: string;
  refundable: boolean;
  changeable: boolean;
  liveMode: boolean;
  passengerIds: string[];
  durationMinutes: number;
  /** One FlightDetail per slice — outbound first, return flagged isReturn. */
  flights: FlightDetail[];
}

function parseIsoDuration(iso?: string): number {
  // Duffel durations are full ISO 8601 and can carry a day component for
  // long-haul itineraries with overnight layovers, e.g. "P1DT4H30M".
  const m = iso?.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?)?$/);
  if (!m) return 0;
  return parseInt(m[1] ?? "0") * 1440 + parseInt(m[2] ?? "0") * 60 + parseInt(m[3] ?? "0");
}

function humanDuration(mins: number): string {
  return `${Math.floor(mins / 60)}h ${String(mins % 60).padStart(2, "0")}m`;
}

function timeOf(iso: string): string {
  return iso.slice(11, 16);
}

function dateOf(iso: string): string {
  return iso.slice(0, 10);
}

function sliceToFlightDetail(slice: DuffelSlice, pricePerSlice: number, isReturn: boolean): FlightDetail {
  const segs = slice.segments;
  const first = segs[0];
  const last = segs[segs.length - 1];
  const layovers = segs.slice(0, -1).map((s, i) => {
    const wait = new Date(segs[i + 1].departing_at).getTime() - new Date(s.arriving_at).getTime();
    return {
      airport: s.destination.iata_code,
      duration: humanDuration(Math.max(0, Math.round(wait / 60_000))),
    };
  });
  const mins = slice.duration
    ? parseIsoDuration(slice.duration)
    : segs.reduce((sum, s) => sum + parseIsoDuration(s.duration), 0);

  return {
    airline: first.marketing_carrier.name,
    flightNumber: `${first.marketing_carrier.iata_code}${first.marketing_carrier_flight_number}`,
    departure: { airport: first.origin.iata_code, time: timeOf(first.departing_at), date: dateOf(first.departing_at) },
    arrival: { airport: last.destination.iata_code, time: timeOf(last.arriving_at), date: dateOf(last.arriving_at) },
    layovers,
    duration: humanDuration(mins),
    price: Math.round(pricePerSlice),
    isReturn,
  };
}

function toSummary(offer: DuffelOffer): DuffelOfferSummary {
  const total = parseFloat(offer.total_amount);
  const perSlice = total / offer.slices.length;
  const flights = offer.slices.map((s, i) => sliceToFlightDetail(s, perSlice, i > 0));
  const durationMinutes = offer.slices.reduce(
    (sum, s) =>
      sum +
      (s.duration
        ? parseIsoDuration(s.duration)
        : s.segments.reduce((m, seg) => m + parseIsoDuration(seg.duration), 0)),
    0
  );

  return {
    offerId: offer.id,
    expiresAt: offer.expires_at,
    totalAmount: total,
    totalAmountRaw: offer.total_amount,
    totalCurrency: offer.total_currency,
    airlineName: offer.owner.name,
    airlineCode: offer.owner.iata_code,
    airlineLogo: offer.owner.logo_symbol_url,
    refundable: Boolean(offer.conditions?.refund_before_departure?.allowed),
    changeable: Boolean(offer.conditions?.change_before_departure?.allowed),
    liveMode: offer.live_mode,
    passengerIds: offer.passengers.map((p) => p.id),
    durationMinutes,
    flights,
  };
}

/* ─── Search ────────────────────────────────────────────────── */

export interface DuffelSearchParams {
  origin: string; // IATA
  destination: string; // IATA
  departureDate: string; // YYYY-MM-DD
  returnDate?: string;
  adults: number;
  children?: number;
  cabinClass: "economy" | "premium_economy" | "business" | "first";
  maxConnections?: number;
}

export async function searchDuffelOffers(params: DuffelSearchParams): Promise<DuffelOfferSummary[]> {
  const slices: { origin: string; destination: string; departure_date: string }[] = [
    { origin: params.origin, destination: params.destination, departure_date: params.departureDate },
  ];
  if (params.returnDate) {
    slices.push({ origin: params.destination, destination: params.origin, departure_date: params.returnDate });
  }

  // Adults as { type: "adult" }; children carry an age (Duffel requires it for
  // non-adult passengers). 8 is a reasonable mid-childhood default for pricing.
  const passengers = [
    ...Array.from({ length: params.adults }, () => ({ type: "adult" as const })),
    ...Array.from({ length: params.children ?? 0 }, () => ({ age: 8 })),
  ];

  const request = await duffelFetch<DuffelOfferRequest>("/air/offer_requests", {
    method: "POST",
    query: { return_offers: "false", supplier_timeout: "15000" },
    body: {
      slices,
      passengers,
      cabin_class: params.cabinClass,
      max_connections: params.maxConnections ?? 1,
    },
    timeoutMs: 25_000,
  });

  const offers = await duffelFetch<DuffelOffer[]>("/air/offers", {
    query: {
      offer_request_id: request.id,
      sort: "total_amount",
      limit: "30",
    },
    timeoutMs: 20_000,
  });

  return offers.map(toSummary);
}

/** Re-fetch a single offer for a fresh price right before booking. */
export async function getDuffelOffer(offerId: string): Promise<DuffelOfferSummary> {
  const offer = await duffelFetch<DuffelOffer>(`/air/offers/${encodeURIComponent(offerId)}`, { timeoutMs: 20_000 });
  return toSummary(offer);
}

/* ─── Booking ───────────────────────────────────────────────── */

export interface DuffelOrderPassenger {
  id: string; // pas_… id from the offer
  title: string; // mr | mrs | ms | miss
  gender: "m" | "f";
  given_name: string;
  family_name: string;
  born_on: string; // YYYY-MM-DD
  email: string;
  phone_number: string; // E.164
}

export async function createDuffelOrder(input: {
  offerId: string;
  amount: string; // must exactly match the offer's total_amount
  currency: string; // must exactly match the offer's total_currency
  passengers: DuffelOrderPassenger[];
}): Promise<DuffelOrder> {
  return duffelFetch<DuffelOrder>("/air/orders", {
    method: "POST",
    body: {
      selected_offers: [input.offerId],
      payments: [{ type: "balance", amount: input.amount, currency: input.currency }],
      passengers: input.passengers,
    },
    timeoutMs: 60_000,
  });
}
