import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { duffelConfigured, searchDuffelOffers, DuffelApiError } from "@/lib/duffel";
import { rateLimit } from "@/lib/cache";

const searchSchema = z.object({
  origin: z.string().length(3),
  destination: z.string().length(3),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.number().int().min(1).max(9),
  children: z.number().int().min(0).max(8).optional(),
  cabinClass: z.enum(["economy", "premium_economy", "business", "first"]),
  directOnly: z.boolean().optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!duffelConfigured()) return NextResponse.json({ error: "Flight booking is not configured." }, { status: 503 });
  if (!rateLimit(`flights:search:${session.user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests — please wait a moment and try again." }, { status: 429 });
  }

  const parsed = searchSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid search parameters." }, { status: 400 });
  const p = parsed.data;

  if (p.origin.toUpperCase() === p.destination.toUpperCase()) {
    return NextResponse.json({ error: "Origin and destination must differ." }, { status: 400 });
  }
  if (p.returnDate && p.returnDate < p.departureDate) {
    return NextResponse.json({ error: "Return date is before departure." }, { status: 400 });
  }

  try {
    // Returns DuffelOfferSummary[] (offerId + passengerIds + flights) — the exact
    // shape the booking flow needs. Offers come sorted cheapest-first.
    const offers = await searchDuffelOffers({
      origin: p.origin.toUpperCase(),
      destination: p.destination.toUpperCase(),
      departureDate: p.departureDate,
      returnDate: p.returnDate,
      adults: p.adults,
      children: p.children ?? 0,
      cabinClass: p.cabinClass,
      maxConnections: p.directOnly ? 0 : 1,
    });
    return NextResponse.json({ offers });
  } catch (err) {
    if (err instanceof DuffelApiError) {
      console.error("Duffel search error:", err.code, err.message);
      return NextResponse.json(
        { error: err.status >= 500 ? "The flight search service is unavailable — try again shortly." : err.message },
        { status: 502 }
      );
    }
    console.error("Flight search error:", err);
    return NextResponse.json({ error: "Flight search failed." }, { status: 500 });
  }
}
