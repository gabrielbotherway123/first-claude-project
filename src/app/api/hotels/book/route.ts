import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/cache";
import {
  duffelStaysConfigured,
  createDuffelStaysQuote,
  createDuffelStaysBooking,
} from "@/lib/duffel-stays";
import { duffelLiveMode, DuffelApiError } from "@/lib/duffel";
import { sendHotelOrderConfirmation } from "@/lib/email";

const guestSchema = z.object({
  givenName: z.string().trim().min(1).max(60),
  familyName: z.string().trim().min(1).max(60),
});

const bookSchema = z.object({
  rateId: z.string().regex(/^rat_[A-Za-z0-9]+$/),
  // The total the guest saw and agreed to — booking is blocked if the live
  // price no longer matches, so nobody is charged an unseen amount.
  expectedTotal: z.number().positive(),
  expectedCurrency: z.string().length(3),
  accommodationName: z.string().trim().min(1).max(200),
  city: z.string().trim().min(1).max(100),
  checkInDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  checkOutDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  roomName: z.string().trim().max(200).optional(),
  email: z.string().email(),
  phoneNumber: z.string().regex(/^\+[1-9]\d{6,14}$/, "Phone must be in international format, e.g. +447700900123"),
  guests: z.array(guestSchema).min(1).max(9),
  specialRequests: z.string().trim().max(500).optional(),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!duffelStaysConfigured()) {
    return NextResponse.json({ error: "Hotel booking is not configured." }, { status: 503 });
  }
  if (!rateLimit(`hotels:book:${session.user.id}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many booking attempts — please wait before trying again." }, { status: 429 });
  }

  const parsed = bookSchema.safeParse(await req.json().catch(() => null));
  if (!parsed.success) {
    const issue = parsed.error.issues[0];
    return NextResponse.json(
      { error: issue ? `${issue.path.join(".")}: ${issue.message}` : "Invalid booking request." },
      { status: 400 }
    );
  }
  const p = parsed.data;

  try {
    // The quote re-confirms availability and price — the live re-price check.
    const quote = await createDuffelStaysQuote(p.rateId);

    if (quote.total_currency !== p.expectedCurrency || Math.abs(parseFloat(quote.total_amount) - p.expectedTotal) > 0.005) {
      return NextResponse.json(
        {
          error: "The price changed while you were booking.",
          code: "price_changed",
          newTotal: parseFloat(quote.total_amount),
          newCurrency: quote.total_currency,
        },
        { status: 409 }
      );
    }

    const booking = await createDuffelStaysBooking({
      quoteId: quote.id,
      email: p.email,
      phoneNumber: p.phoneNumber,
      guests: p.guests.map((g) => ({ given_name: g.givenName, family_name: g.familyName })),
      specialRequests: p.specialRequests,
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
        accommodationName: p.accommodationName,
        city: p.city,
        checkInDate: booking.check_in_date || p.checkInDate,
        checkOutDate: booking.check_out_date || p.checkOutDate,
        roomName: p.roomName,
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
      console.error("Duffel Stays booking error:", err.code, err.message);
      if (["rate_expired", "rate_no_longer_available", "quote_expired"].includes(err.code)) {
        return NextResponse.json(
          { error: "This rate is no longer available — please search again.", code: "rate_expired" },
          { status: 410 }
        );
      }
      if (err.code === "insufficient_balance") {
        return NextResponse.json(
          { error: "The booking account has insufficient balance for this rate.", code: "insufficient_balance" },
          { status: 402 }
        );
      }
      return NextResponse.json(
        { error: err.status >= 500 ? "The booking service is unavailable — try again shortly." : err.message },
        { status: 502 }
      );
    }
    console.error("Hotel booking error:", err);
    return NextResponse.json({ error: "Booking failed." }, { status: 500 });
  }
}
