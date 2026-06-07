import "server-only";
import type { Airport } from "@/lib/airports";
import { cached } from "@/lib/cache";

/**
 * Looks up airports via AviationStack to enrich the bundled dataset. The free
 * tier is rate-limited (100 req/mo, no text search), so the bundled IATA list
 * remains the primary autocomplete source for reliability; this only fills gaps
 * for IATA codes the bundle doesn't know. Results are cached for a day.
 */
export async function searchAirportsLive(query: string): Promise<Airport[]> {
  const key = process.env.AVIATIONSTACK_API_KEY;
  const q = query.trim();
  if (!key || q.length < 2) return [];

  const cacheKey = `aviationstack:${q.toLowerCase()}`;
  try {
    return await cached(cacheKey, 24 * 60 * 60 * 1000, async () => {
      const qs = new URLSearchParams({ access_key: key });
      // The API has no free-text search; an exact IATA code is the reliable query.
      if (/^[A-Za-z]{3}$/.test(q)) qs.set("iata_code", q.toUpperCase());
      else qs.set("search", q);

      const res = await fetch(`https://api.aviationstack.com/v1/airports?${qs.toString()}`);
      if (!res.ok) return [];
      const json = await res.json();
      const rows = Array.isArray(json.data) ? json.data : [];
      return rows
        .filter((r: Record<string, unknown>) => r.iata_code)
        .slice(0, 8)
        .map((r: Record<string, unknown>) => ({
          iata: String(r.iata_code).toUpperCase(),
          name: String(r.airport_name ?? "Airport"),
          city: String(r.city_iata_code ?? r.airport_name ?? ""),
          country: String(r.country_name ?? ""),
        })) as Airport[];
    });
  } catch {
    return [];
  }
}
