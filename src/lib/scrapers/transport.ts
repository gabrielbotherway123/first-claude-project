import "server-only";
import type { TransferEstimate } from "@/lib/types";
import { cacheGet, cacheSet } from "@/lib/cache";
import { newPage, delay } from "./browser";

// Rough taxi/rideshare rate per km by currency, plus a flagfall, for converting
// a scraped driving distance into an approximate fare.
const RATE_PER_KM: Record<string, { rate: number; flag: number }> = {
  USD: { rate: 2.2, flag: 6 }, GBP: { rate: 2.0, flag: 6 }, EUR: { rate: 2.2, flag: 6 },
  NZD: { rate: 3.0, flag: 8 }, AUD: { rate: 2.8, flag: 7 }, SGD: { rate: 1.8, flag: 5 },
  AED: { rate: 3.0, flag: 12 }, JPY: { rate: 320, flag: 700 }, CHF: { rate: 3.5, flag: 8 },
  CAD: { rate: 2.5, flag: 7 },
};

export async function scrapeTransfer(params: {
  from: string; // airport label
  to: string; // city / hotel label
  currency: string;
}): Promise<TransferEstimate | null> {
  const cacheKey = `scrape:transfer:${params.from}->${params.to}:${params.currency}`;
  const hit = cacheGet<TransferEstimate>(cacheKey);
  if (hit) return hit;

  try {
    const page = await newPage();
    try {
      const url = `https://www.google.com/maps/dir/${encodeURIComponent(
        params.from
      )}/${encodeURIComponent(params.to)}/data=!4m2!4m1!3e0`;
      await page.goto(url, { waitUntil: "networkidle2", timeout: 30000 });
      await delay(3000);

      const panelText = await page.evaluate(() => document.body.innerText || "");
      const distMatch = panelText.match(/([\d,.]+)\s*km/);
      const distanceKm = distMatch ? parseFloat(distMatch[1].replace(",", "")) : NaN;
      if (!Number.isFinite(distanceKm) || distanceKm <= 0) return null;

      const { rate, flag } = RATE_PER_KM[params.currency] ?? { rate: 2.2, flag: 6 };
      const amount = Math.round(flag + distanceKm * rate);

      const estimate: TransferEstimate = {
        provider: "Taxi / rideshare",
        product: "Driving",
        amount,
        currency: params.currency,
        from: params.from,
        to: params.to,
        note: `~${distanceKm.toFixed(0)} km drive (scraped from Google Maps).`,
        bookingLink: "https://www.uber.com/global/en/price-estimate/",
        live: true,
      };
      cacheSet(cacheKey, estimate, 15 * 60 * 1000); // cache successes only
      return estimate;
    } finally {
      await page.close().catch(() => {});
    }
  } catch {
    return null;
  }
}
