import "server-only";
import type { HotelOption } from "@/lib/types";
import { coordsForCity } from "@/lib/airports";
import { cacheGet, cacheSet } from "@/lib/cache";
import { ProviderResult, isConfigured } from "./types";
import { searchDuffelStays, duffelStaysConfigured } from "@/lib/duffel-stays";
import { DuffelApiError } from "@/lib/duffel";

export { duffelStaysConfigured };

export async function duffelHotels(params: {
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  stars: number;
  currency: string;
  nights: number;
}): Promise<ProviderResult<HotelOption[]>> {
  if (!isConfigured(process.env.DUFFEL_ACCESS_TOKEN)) {
    return { ok: false, error: "Duffel not configured (set DUFFEL_ACCESS_TOKEN)." };
  }

  const coords = coordsForCity(params.city);
  if (!coords) {
    return { ok: false, error: `No coordinates on file for "${params.city}" — can't search Duffel Stays.` };
  }

  const cacheKey = `duffel-stays:hotels:${JSON.stringify(params)}`;
  const hit = cacheGet<HotelOption[]>(cacheKey);
  if (hit) return { ok: true, data: hit };

  try {
    const results = await searchDuffelStays({
      latitude: coords.lat,
      longitude: coords.lng,
      checkInDate: params.checkIn,
      checkOutDate: params.checkOut,
      adults: params.adults,
      city: params.city,
    });

    const nights = params.nights || 1;
    const minStars = Math.max(3, params.stars || 4);

    const hotels: HotelOption[] = results
      .filter((r) => r.cheapestTotal !== undefined && r.cheapestCurrency === params.currency)
      .filter((r) => r.stars === 0 || r.stars >= minStars) // keep unrated results rather than dropping them
      .map((r) => {
        const total = r.cheapestTotal!;
        const bookingLink = `/hotels/book?${new URLSearchParams({
          accommodationId: r.accommodationId,
          city: params.city,
          checkIn: params.checkIn,
          checkOut: params.checkOut,
          adults: String(params.adults),
        }).toString()}`;
        return {
          name: r.name,
          location: r.city || params.city,
          address: r.address,
          stars: r.stars || params.stars,
          nightlyRate: Math.round(total / nights),
          totalCost: Math.round(total),
          amenities: [],
          rating: r.reviewScore,
          cancellationPolicy: "Cancellation terms confirmed when you pick a rate",
          bookingLink,
        };
      });

    if (hotels.length === 0) {
      return { ok: false, error: "No Duffel Stays results for this destination/date (test mode only covers its fixed test coordinates)." };
    }

    cacheSet(cacheKey, hotels, 10 * 60 * 1000); // cache successes only
    return { ok: true, data: hotels };
  } catch (err) {
    const msg =
      err instanceof DuffelApiError
        ? `Duffel Stays search failed (${err.code}): ${err.message}`
        : err instanceof Error
          ? err.message
          : "Duffel Stays request failed.";
    return { ok: false, error: msg };
  }
}
