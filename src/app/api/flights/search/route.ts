import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { duffelPlanSearchEnabled, searchDuffelOffers } from "@/lib/providers/duffel";
import { rateLimit } from "@/lib/cache";

const searchSchema = z.object({
  origin: z.string().length(3),
  destination: z.string().length(3),
  departureDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  returnDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  adults: z.number().int().min(1).max(9),
  cabinClass: z.enum(["economy", "premium_economy", "business", "first"]),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!duffelPlanSearchEnabled()) return NextResponse.json({ error: "Flight booking is not configured." }, { status: 503 });
  if (!rateLimit(`flights:search:${session.user.id}`, 20, 60_000)) return NextResponse.json({ error: "Too many requests — please wait a moment and try again." }, { status: 429 });

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
    const result = await searchDuffelOffers({
      origin: p.origin.toUpperCase(),
      destination: p.destination.toUpperCase(),
      departureDate: p.departureDate,
      returnDate: p.returnDate,
      adults: p.adults,
      cabinClass: p.cabinClass,
      currency: "USD",
    });
    if (!result.ok) throw new Error(result.error || "Search failed");
    return NextResponse.json({ offers: result.data || [] });
  } catch (err) {
    console.error("Flight search error:", err);
    return NextResponse.json({ error: "Flight search failed." }, { status: 500 });
  }
}
