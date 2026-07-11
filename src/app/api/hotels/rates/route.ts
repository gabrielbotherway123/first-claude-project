import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/cache";
import {
  duffelStaysConfigured,
  searchDuffelStaysByAccommodation,
  fetchDuffelStaysRates,
} from "@/lib/duffel-stays";
import { DuffelApiError } from "@/lib/duffel";

const schema = z.object({
  accommodationId: z.string().regex(/^acc_[A-Za-z0-9]+$/),
  city: z.string().trim().min(1).max(100),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(9),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!duffelStaysConfigured()) {
    return NextResponse.json({ error: "Hotel booking is not configured." }, { status: 503 });
  }
  if (!rateLimit(`hotels:rates:${session.user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests — please wait a moment and try again." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }
  const p = parsed.data;
  if (p.checkOut <= p.checkIn) {
    return NextResponse.json({ error: "Check-out must be after check-in." }, { status: 400 });
  }

  try {
    const match = await searchDuffelStaysByAccommodation({
      accommodationId: p.accommodationId,
      checkInDate: p.checkIn,
      checkOutDate: p.checkOut,
      adults: p.adults,
      city: p.city,
    });
    if (!match) {
      return NextResponse.json({ error: "This property is no longer available for those dates." }, { status: 404 });
    }

    const { accommodationName, rates } = await fetchDuffelStaysRates(match.searchResultId);
    if (rates.length === 0) {
      return NextResponse.json({ error: "No rates available for this property right now." }, { status: 404 });
    }

    return NextResponse.json({
      accommodationName,
      address: match.address,
      city: match.city,
      rates: rates.sort((a, b) => a.totalAmount - b.totalAmount),
    });
  } catch (err) {
    if (err instanceof DuffelApiError) {
      console.error("Duffel Stays rates error:", err.code, err.message);
      return NextResponse.json(
        { error: err.status >= 500 ? "The hotel search service is unavailable — try again shortly." : err.message },
        { status: 502 }
      );
    }
    console.error("Hotel rates error:", err);
    return NextResponse.json({ error: "Failed to load rates." }, { status: 500 });
  }
}
