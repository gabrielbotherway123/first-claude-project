import "server-only";
import { cached } from "@/lib/cache";
import { ProviderResult, isConfigured } from "./types";

export interface HotelOption {
  name: string;
  location: string;
  address: string;
  stars: number;
  nightlyRate: number;
  totalCost: number;
  amenities: string[];
  rating?: number; // guest score 0-10
  cancellationPolicy: string;
  bookingLink: string;
}

/**
 * Affiliate deep-link to Booking.com search results for a destination. Carries
 * the affiliate id (`aid`) so any booking made through it earns commission —
 * this works immediately, without the partner availability API being approved.
 */
export function bookingSearchLink(opts: {
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  stars?: number;
}): string {
  const aid = process.env.BOOKING_AFFILIATE_ID;
  const qs = new URLSearchParams({
    ss: opts.city,
    checkin: opts.checkIn,
    checkout: opts.checkOut,
    group_adults: String(opts.adults),
    group_children: "0",
    no_rooms: "1",
  });
  if (aid) qs.set("aid", aid);
  if (opts.stars) qs.set("nflt", `class=${opts.stars}`);
  return `https://www.booking.com/searchresults.html?${qs.toString()}`;
}

/**
 * Searches real hotel availability via the Booking.com Demand API. Requires
 * partner approval + a Demand API token (BOOKING_API_TOKEN). Until that is in
 * place this returns a clear error and the caller falls back to affiliate
 * search links via bookingSearchLink().
 */
export async function searchHotels(params: {
  city: string;
  latitude?: number;
  longitude?: number;
  checkIn: string;
  checkOut: string;
  adults: number;
  stars: number;
  currency: string;
  nights: number;
}): Promise<ProviderResult<HotelOption[]>> {
  const token = process.env.BOOKING_API_TOKEN;
  const affiliateId = process.env.BOOKING_AFFILIATE_ID;

  if (!isConfigured(token)) {
    return {
      ok: false,
      error: isConfigured(affiliateId)
        ? "Booking.com Demand API not approved yet — showing affiliate search links instead."
        : "Booking.com not configured (set BOOKING_AFFILIATE_ID, and BOOKING_API_TOKEN once approved).",
    };
  }

  const cacheKey = `booking:hotels:${JSON.stringify(params)}`;
  try {
    return await cached(cacheKey, 10 * 60 * 1000, async () => {
      // Booking.com Demand API v3 — accommodations search.
      const res = await fetch("https://demandapi.booking.com/3.1/accommodations/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
          "X-Affiliate-Id": affiliateId ?? "",
        },
        body: JSON.stringify({
          booker: { country: "us", platform: "desktop" },
          checkin: params.checkIn,
          checkout: params.checkOut,
          city: params.city,
          guests: { number_of_adults: params.adults, number_of_rooms: 1 },
          currency: params.currency,
          extras: ["extra_charges", "products"],
          rows: 15,
        }),
      });
      if (!res.ok) {
        const text = await res.text();
        throw new Error(`Booking.com search failed (${res.status}): ${text.slice(0, 180)}`);
      }
      const json = await res.json();
      const rows = Array.isArray(json.data) ? json.data : json.result ?? [];

      const hotels: HotelOption[] = rows.map((h: Record<string, unknown>) => {
        const price = Number(
          (h.price as { total?: number } | undefined)?.total ??
            (h as { min_total_price?: number }).min_total_price ??
            0
        );
        return {
          name: String((h.name as string) ?? "Hotel"),
          location: String((h.city as string) ?? params.city),
          address: String((h.address as string) ?? ""),
          stars: Number((h.class as number) ?? params.stars),
          nightlyRate: params.nights ? Math.round(price / params.nights) : Math.round(price),
          totalCost: Math.round(price),
          amenities: Array.isArray(h.facilities) ? (h.facilities as string[]).slice(0, 8) : [],
          rating: Number((h.review_score as number) ?? 0) || undefined,
          cancellationPolicy: (h as { is_free_cancellable?: boolean }).is_free_cancellable
            ? "Free cancellation available"
            : "Check cancellation policy at booking",
          bookingLink: String(
            (h.url as string) ??
              bookingSearchLink({
                city: params.city,
                checkIn: params.checkIn,
                checkOut: params.checkOut,
                adults: params.adults,
                stars: params.stars,
              })
          ),
        };
      });

      return { ok: true as const, data: hotels };
    });
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Booking.com request failed." };
  }
}
