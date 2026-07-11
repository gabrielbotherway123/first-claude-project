import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/cache";
import {
  duffelConfigured,
  getDuffelOffer,
  createDuffelOrder,
  DuffelApiError,
  type DuffelOrderPassenger,
} from "@/lib/duffel";
import { sendFlightOrderConfirmation } from "@/lib/email";

const passengerSchema = z.object({
  id: z.string().regex(/^pas_[A-Za-z0-9]+$/),
  title: z.enum(["mr", "mrs", "ms", "miss"]),
  gender: z.enum(["m", "f"]),
  givenName: z.string().trim().min(1).max(60),
  familyName: z.string().trim().min(1).max(60),
  bornOn: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  email: z.string().email(),
  phoneNumber: z.string().regex(/^\+[1-9]\d{6,14}$/, "Phone must be international format, e.g. +447700900123"),
});

const bookSchema = z.object({
  offerId: z.string().regex(/^off_[A-Za-z0-9]+$/),
  // The total the traveller saw and agreed to — booking is blocked if the live
  // price no longer matches, so nobody is charged an unseen amount.
  expectedTotal: z.number().positive(),
  expectedCurrency: z.string().length(3),
  cabinClass: z.enum(["economy", "premium_economy", "business", "first"]).optional(),
  passengers: z.array(passengerSchema).min(1).max(9),
});

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!duffelConfigured()) {
    return NextResponse.json({ error: "Flight booking is not configured." }, { status: 503 });
  }
  if (!rateLimit(`flights:book:${session.user.id}`, 5, 60 * 60_000)) {
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
  const { offerId, expectedTotal, expectedCurrency, cabinClass, passengers } = parsed.data;

  const today = new Date().toISOString().slice(0, 10);
  if (passengers.some((p) => p.bornOn >= today)) {
    return NextResponse.json({ error: "Passenger date of birth must be in the past." }, { status: 400 });
  }

  try {
    // Re-fetch the offer for a live price + valid passenger ids before paying.
    const fresh = await getDuffelOffer(offerId);

    const idsMatch =
      passengers.length === fresh.passengerIds.length &&
      passengers.every((p) => fresh.passengerIds.includes(p.id));
    if (!idsMatch) {
      return NextResponse.json(
        { error: "This fare has expired — please search again for fresh prices.", code: "offer_mismatch" },
        { status: 409 }
      );
    }

    if (fresh.totalCurrency !== expectedCurrency || Math.abs(fresh.totalAmount - expectedTotal) > 0.005) {
      return NextResponse.json(
        {
          error: "The fare changed while you were booking.",
          code: "price_changed",
          newTotal: fresh.totalAmount,
          newCurrency: fresh.totalCurrency,
        },
        { status: 409 }
      );
    }

    const orderPassengers: DuffelOrderPassenger[] = passengers.map((p) => ({
      id: p.id,
      title: p.title,
      gender: p.gender,
      given_name: p.givenName,
      family_name: p.familyName,
      born_on: p.bornOn,
      email: p.email,
      phone_number: p.phoneNumber,
    }));

    // Pay with the offer's exact unmodified amount string (byte-for-byte).
    const order = await createDuffelOrder({
      offerId,
      amount: fresh.totalAmountRaw,
      currency: fresh.totalCurrency,
      passengers: orderPassengers,
    });

    const outbound = fresh.flights.find((f) => !f.isReturn);
    const returnFlight = fresh.flights.find((f) => f.isReturn);

    const record = await prisma.flightOrder.create({
      data: {
        userId: session.user.id,
        duffelOrderId: order.id,
        bookingReference: order.booking_reference || "",
        status: "confirmed",
        liveMode: order.live_mode,
        totalAmount: parseFloat(order.total_amount),
        currency: order.total_currency,
        originCity: outbound?.departure.airport ?? "",
        destinationCity: outbound?.arrival.airport ?? "",
        departureDate: outbound?.departure.date ?? "",
        returnDate: returnFlight?.departure.date ?? null,
        cabinClass: cabinClass ?? "",
        airlineName: fresh.airlineName,
        airlineCode: fresh.airlineCode,
        passengers: JSON.stringify(
          passengers.map((p) => ({ title: p.title, givenName: p.givenName, familyName: p.familyName }))
        ),
        flights: JSON.stringify(fresh.flights),
      },
    });

    sendFlightOrderConfirmation({
      toEmail: passengers[0].email,
      toName: `${passengers[0].givenName} ${passengers[0].familyName}`,
      pnr: record.bookingReference || record.id,
      airlineName: record.airlineName,
      totalAmount: record.totalAmount,
      currency: record.currency,
      liveMode: record.liveMode,
      flights: fresh.flights,
    }).catch((err) => console.error("Flight order email failed:", err));

    return NextResponse.json({ orderId: record.id, pnr: record.bookingReference });
  } catch (err) {
    if (err instanceof DuffelApiError) {
      console.error("Duffel booking error:", err.code, err.message);
      if (["offer_expired", "offer_no_longer_available", "offer_request_already_booked"].includes(err.code)) {
        return NextResponse.json(
          { error: "This fare has expired — please search again for fresh prices.", code: "offer_expired" },
          { status: 410 }
        );
      }
      if (err.code === "price_changed") {
        return NextResponse.json(
          { error: "The fare changed while you were booking — please review and confirm again.", code: "price_changed" },
          { status: 409 }
        );
      }
      if (err.code === "insufficient_balance") {
        return NextResponse.json(
          { error: "The booking account has insufficient balance for this fare.", code: "insufficient_balance" },
          { status: 402 }
        );
      }
      return NextResponse.json(
        { error: err.status >= 500 ? "The booking service is unavailable — try again shortly." : err.message },
        { status: 502 }
      );
    }
    console.error("Flight booking error:", err);
    return NextResponse.json({ error: "Booking failed." }, { status: 500 });
  }
}
