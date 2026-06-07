import { NextRequest, NextResponse } from "next/server";
import { searchAirports, type Airport } from "@/lib/airports";
import { searchAirportsLive } from "@/lib/providers/aviationstack";

export async function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  const bundled = searchAirports(q, 8);

  // Bundled IATA data is the reliable primary source. If it has no match and
  // AviationStack is configured, fall back to live lookup to fill the gap.
  let results: Airport[] = bundled;
  if (bundled.length === 0) {
    const live = await searchAirportsLive(q);
    if (live.length) results = live;
  }

  return NextResponse.json({ results });
}
