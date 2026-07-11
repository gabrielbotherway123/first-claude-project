import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/cache";
import {
  duffelStaysConfigured,
  searchDuffelStays,
  searchDuffelStaysByAccommodation,
  fetchDuffelStaysRates,
  type StaysSearchSummary,
} from "@/lib/duffel-stays";
import { coordsForCity } from "@/lib/airports";
import { DuffelApiError } from "@/lib/duffel";

const schema = z.object({
  // A specific hotel, or empty to auto-pick the best-value hotel in the city.
  accommodationId: z.string().regex(/^acc_[A-Za-z0-9]+$/).optional().or(z.literal("")),
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
    let match: StaysSearchSummary | null;

    if (p.accommodationId) {
      // A specific hotel was chosen — re-search it for a fresh result id.
      match = await searchDuffelStaysByAccommodation({
        accommodationId: p.accommodationId,
        checkInDate: p.checkIn,
        checkOutDate: p.checkOut,
        adults: p.adults,
        city: p.city,
      });
    } else {
      // Only a destination city — search Duffel Stays and auto-pick the
      // best-value hotel so the guest goes straight to booking.
      const coords = coordsForCity(p.city);
      if (!coords) {
        return NextResponse.json(
          { error: `We don't have live hotel coverage for ${p.city} yet.` },
          { status: 404 }
        );
      }
      const results = await searchDuffelStays({
        latitude: coords.lat,
        longitude: coords.lng,
        checkInDate: p.checkIn,
        checkOutDate: p.checkOut,
        adults: p.adults,
        city: p.city,
      });
      const priced = results.filter((r) => r.cheapestTotal !== undefined);
      match =
        priced.sort((a, b) => (a.cheapestTotal ?? 0) - (b.cheapestTotal ?? 0))[0] ??
        results[0] ??
        null;
    }

    if (!match) {
      return NextResponse.json(
        { error: `No bookable hotels found in ${p.city} for those dates.` },
        { status: 404 }
      );
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
      console.error("Duffel Stays rates error:", err.status, err.code, err.message);
      if (err.status === 401 || err.status === 403) {
        return NextResponse.json(
          { error: "Hotel booking isn't enabled on this Duffel account yet — activate Duffel Stays in your Duffel dashboard to book hotels." },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: err.status >= 500 ? "The hotel search service is unavailable — try again shortly." : err.message },
        { status: 502 }
      );
    }
    console.error("Hotel rates error:", err);
    return NextResponse.json({ error: "Failed to load rates." }, { status: 500 });
  }
}
