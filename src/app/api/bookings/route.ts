import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { sendBookingConfirmation } from "@/lib/email";

function generateReference(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let ref = "ET-";
  for (let i = 0; i < 8; i++) {
    ref += chars[Math.floor(Math.random() * chars.length)];
  }
  return ref;
}

export async function POST(req: NextRequest) {
  try {
    const { tripId, planId } = await req.json();

    if (!tripId || !planId) {
      return NextResponse.json({ error: "Missing tripId or planId" }, { status: 400 });
    }

    // Check no existing booking
    const existing = await prisma.booking.findFirst({
      where: { OR: [{ tripId }, { planId }] },
    });
    if (existing) {
      return NextResponse.json({ bookingId: existing.id, reference: existing.reference });
    }

    const reference = generateReference();

    const booking = await prisma.booking.create({
      data: { tripId, planId, reference, status: "confirmed" },
      include: {
        trip: true,
        plan: true,
      },
    });

    // Build BookingDetails for email
    const bookingDetails = {
      id: booking.id,
      reference: booking.reference,
      createdAt: booking.createdAt.toISOString(),
      status: booking.status,
      trip: {
        id: booking.trip.id,
        fullName: booking.trip.fullName,
        email: booking.trip.email,
        phone: booking.trip.phone,
        originCity: booking.trip.originCity,
        destinations: JSON.parse(booking.trip.destinations),
        departureDate: booking.trip.departureDate,
        returnDate: booking.trip.returnDate,
        numberOfNights: booking.trip.numberOfNights,
        totalBudget: booking.trip.totalBudget,
        currency: booking.trip.currency,
        numberOfTravellers: booking.trip.numberOfTravellers,
        cabinClass: booking.trip.cabinClass as "economy" | "business" | "first",
        hotelStarRating: booking.trip.hotelStarRating,
        locationPreference: booking.trip.locationPreference as "city_centre" | "airport" | "flexible",
        amenities: JSON.parse(booking.trip.amenities),
        tripPurpose: booking.trip.tripPurpose,
        specialRequirements: booking.trip.specialRequirements ?? undefined,
        loyaltyNumbers: booking.trip.loyaltyNumbers ?? undefined,
      },
      plan: {
        id: booking.plan.id,
        planIndex: booking.plan.planIndex,
        label: booking.plan.label,
        justification: booking.plan.justification,
        flights: JSON.parse(booking.plan.flights),
        hotel: JSON.parse(booking.plan.hotel),
        flightCost: booking.plan.flightCost,
        hotelCost: booking.plan.hotelCost,
        totalCost: booking.plan.totalCost,
      },
    };

    // Send confirmation email (fire-and-forget; don't block on failure)
    sendBookingConfirmation(bookingDetails).catch((err) => {
      console.error("Email send failed:", err);
    });

    return NextResponse.json({ bookingId: booking.id, reference: booking.reference });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/bookings error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
