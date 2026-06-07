import { NextRequest, NextResponse } from "next/server";
import { searchAirports } from "@/lib/airports";

export function GET(req: NextRequest) {
  const q = req.nextUrl.searchParams.get("q") ?? "";
  return NextResponse.json({ results: searchAirports(q, 8) });
}
