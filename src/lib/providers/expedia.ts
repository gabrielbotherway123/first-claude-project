import "server-only";

/**
 * Expedia flight + hotel **package** deep-link (one cart, one payment). Pre-fills
 * the route, dates, travellers and cabin as far as Expedia's package URL allows.
 *
 * Commission: Expedia's affiliate runs through Partnerize. Set EXPEDIA_CAMREF to
 * your campaign reference and the link is wrapped in the tracking redirect so
 * bookings earn commission; without it, it's a plain (untracked) Expedia link.
 *
 * Note: Expedia's package URL scheme is undocumented and anti-bot'd, so the
 * pre-fill is best-effort — test in a browser and adjust params if needed.
 */
const CABIN: Record<string, string> = { economy: "coach", business: "business", first: "first" };

function mdY(iso: string): string {
  const [y, m, d] = iso.split("-");
  return `${m}/${d}/${y}`;
}

export function expediaPackageLink(opts: {
  origin: string; // IATA
  destination: string; // IATA
  departureDate: string;
  returnDate?: string;
  adults: number;
  cabinClass: "economy" | "premium_economy" | "business" | "first";
}): string {
  const cabin = CABIN[opts.cabinClass] ?? "coach";
  const leg1 = `from:${opts.origin},to:${opts.destination},departure:${mdY(opts.departureDate)}TANYT`;
  const parts = [
    `trip=${opts.returnDate ? "roundtrip" : "oneway"}`,
    `leg1=${encodeURIComponent(leg1)}`,
  ];
  if (opts.returnDate) {
    const leg2 = `from:${opts.destination},to:${opts.origin},departure:${mdY(opts.returnDate)}TANYT`;
    parts.push(`leg2=${encodeURIComponent(leg2)}`);
  }
  parts.push(`passengers=${encodeURIComponent(`adults:${opts.adults}`)}`);
  parts.push(`cabinclass=${cabin}`, "mode=search");

  const dest = `https://www.expedia.com/Flight-Hotel-Search?${parts.join("&")}`;

  const camref = process.env.EXPEDIA_CAMREF;
  if (camref) {
    return `https://expedia.prf.hn/click/camref:${camref}/destination:${encodeURIComponent(dest)}`;
  }
  return dest;
}
