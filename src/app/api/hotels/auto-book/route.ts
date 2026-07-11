import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/cache";
import {
  duffelStaysConfigured,
  searchDuffelStays,
  fetchDuffelStaysRates,
  createDuffelStaysQuote,
  createDuffelStaysBooking,
} from "@/lib/duffel-stays";
import { coordsForCity } from "@/lib/airports";
import { duffelLiveMode, DuffelApiError } from "@/lib/duffel";
import { sendHotelOrderConfirmation } from "@/lib/email";

// Books a hotel in one shot: search the city, pick the best-value hotel and its
// cheapest rate, quote and book — no rate-selection step. Used by the combined
// "Book now" so a single press books the flight and the stay together.
const schema = z.object({
  city: z.string().trim().min(1).max(100),
  checkIn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOut: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  adults: z.number().int().min(1).max(9),
  email: z.string().email(),
  phoneNumber: z.string().regex(/^\+[1-9]\d{6,14}$/),
  guests: z.array(z.object({ givenName: z.string().trim().min(1).max(60), familyName: z.string().trim().min(1).max(60) })).min(1).max(9),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!duffelStaysConfigured()) return NextResponse.json({ error: "Hotel booking is not configured." }, { status: 503 });
  if (!rateLimit(`hotels:autobook:${session.user.id}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many booking attempts — please wait." }, { status: 429 });
  }

  const parsed = schema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  const p = parsed.data;
  if (p.checkOut <= p.checkIn) return NextResponse.json({ error: "Check-out must be after check-in." }, { status: 400 });

  try {
    const coords = coordsForCity(p.city);
    if (!coords) {
      return NextResponse.json({ error: `We don't have live hotel coverage for ${p.city} yet.` }, { status: 404 });
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
    const match = priced.sort((a, b) => (a.cheapestTotal ?? 0) - (b.cheapestTotal ?? 0))[0] ?? results[0];
    if (!match) {
      return NextResponse.json({ error: `No bookable hotels found in ${p.city} for those dates.` }, { status: 404 });
    }

    const { accommodationName, rates } = await fetchDuffelStaysRates(match.searchResultId);
    const rate = [...rates].sort((a, b) => a.totalAmount - b.totalAmount)[0];
    if (!rate) {
      return NextResponse.json({ error: "No rates available for this hotel right now." }, { status: 404 });
    }

    const quote = await createDuffelStaysQuote(rate.rateId);
    const booking = await createDuffelStaysBooking({
      quoteId: quote.id,
      email: p.email,
      phoneNumber: p.phoneNumber,
      guests: p.guests.map((g) => ({ given_name: g.givenName, family_name: g.familyName })),
    });

    const record = await prisma.hotelOrder.create({
      data: {
        userId: session.user.id,
        duffelBookingId: booking.id,
        bookingReference: booking.reference ?? "",
        status: booking.status || "confirmed",
        liveMode: duffelLiveMode(),
        totalAmount: parseFloat(quote.total_amount),
        currency: quote.total_currency,
        accommodationName,
        city: match.city || p.city,
        address: match.address,
        checkInDate: booking.check_in_date || p.checkIn,
        checkOutDate: booking.check_out_date || p.checkOut,
        roomName: rate.roomName,
        guests: JSON.stringify(p.guests),
      },
    });

    sendHotelOrderConfirmation({
      toEmail: p.email,
      toName: `${p.guests[0].givenName} ${p.guests[0].familyName}`,
      reference: record.bookingReference || record.id,
      accommodationName: record.accommodationName,
      city: record.city,
      checkInDate: record.checkInDate,
      checkOutDate: record.checkOutDate,
      totalAmount: record.totalAmount,
      currency: record.currency,
      liveMode: record.liveMode,
    }).catch((err) => console.error("Hotel order email failed:", err));

    return NextResponse.json({ orderId: record.id, reference: record.bookingReference });
  } catch (err) {
    if (err instanceof DuffelApiError) {
      console.error("Duffel Stays auto-book error:", err.status, err.code, err.message);
      if (err.status === 401 || err.status === 403) {
        return NextResponse.json(
          { error: "Hotel booking isn't enabled on this Duffel account yet — activate Duffel Stays in your Duffel dashboard.", code: "stays_not_enabled" },
          { status: 503 }
        );
      }
      return NextResponse.json(
        { error: err.status >= 500 ? "The hotel booking service is unavailable — try again shortly." : err.message },
        { status: 502 }
      );
    }
    console.error("Hotel auto-book error:", err);
    return NextResponse.json({ error: "Hotel booking failed." }, { status: 500 });
  }
}
