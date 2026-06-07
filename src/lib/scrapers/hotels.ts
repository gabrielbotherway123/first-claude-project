import "server-only";
import type { HotelOption } from "@/lib/providers/booking";
import { bookingSearchLink } from "@/lib/providers/booking";
import { cacheGet, cacheSet } from "@/lib/cache";
import type { ProviderResult } from "@/lib/providers/types";
import { newPage, delay } from "./browser";

function bookingUrl(p: {
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  stars: number;
}): string {
  const aid = process.env.BOOKING_AFFILIATE_ID;
  const qs = new URLSearchParams({
    ss: p.city,
    checkin: p.checkIn,
    checkout: p.checkOut,
    group_adults: String(p.adults),
    group_children: "0",
    no_rooms: "1",
  });
  if (aid) qs.set("aid", aid);
  if (p.stars) qs.set("nflt", `class=${p.stars}`);
  return `https://www.booking.com/searchresults.html?${qs.toString()}`;
}

/** Best-effort scrape of Booking.com search results. Returns []/error when blocked. */
export async function scrapeHotels(params: {
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  stars: number;
  currency: string;
  nights: number;
}): Promise<ProviderResult<HotelOption[]>> {
  const cacheKey = `scrape:hotels:${JSON.stringify(params)}`;
  const hit = cacheGet<HotelOption[]>(cacheKey);
  if (hit) return { ok: true, data: hit };

  try {
    const page = await newPage();
    try {
      await page.goto(bookingUrl(params), { waitUntil: "networkidle2", timeout: 30000 });
      await delay(2500);

        const raw = await page.evaluate(() => {
          const cards = Array.from(document.querySelectorAll('[data-testid="property-card"]'));
          return cards.slice(0, 10).map((c) => {
            const text = (sel: string) =>
              (c.querySelector(sel)?.textContent || "").trim();
            const link =
              (c.querySelector('a[data-testid="title-link"]') as HTMLAnchorElement | null)?.href ||
              (c.querySelector("a") as HTMLAnchorElement | null)?.href ||
              "";
            const stars =
              c.querySelectorAll('[data-testid="rating-stars"] span, [data-testid="rating-squares"] span')
                .length || 0;
            return {
              name: text('[data-testid="title"]'),
              price: text('[data-testid="price-and-discounted-price"]'),
              review: text('[data-testid="review-score"]'),
              address: text('[data-testid="address"]'),
              stars,
              link,
            };
          });
        });

        const fallbackLink = bookingSearchLink(params);
        const hotels: HotelOption[] = raw
          .filter((r) => r.name)
          .map((r) => {
            const priceNum = parseInt((r.price.match(/[\d,]{2,}/)?.[0] ?? "0").replace(/,/g, "")) || 0;
            const review = parseFloat(r.review.match(/(\d+[.,]?\d*)/)?.[1]?.replace(",", ".") ?? "") || undefined;
            return {
              name: r.name,
              location: r.address || params.city,
              address: r.address,
              stars: r.stars || params.stars,
              nightlyRate: params.nights ? Math.round(priceNum / params.nights) : priceNum,
              totalCost: priceNum,
              amenities: [],
              rating: review,
              cancellationPolicy: "Check cancellation terms on Booking.com",
              bookingLink: r.link || fallbackLink,
            };
          });

      if (hotels.length === 0) {
        return { ok: false, error: "No hotel results scraped (likely blocked or layout changed)." };
      }
      cacheSet(cacheKey, hotels, 15 * 60 * 1000); // cache successes only
      return { ok: true, data: hotels };
    } finally {
      await page.close().catch(() => {});
    }
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Hotel scrape failed." };
  }
}
