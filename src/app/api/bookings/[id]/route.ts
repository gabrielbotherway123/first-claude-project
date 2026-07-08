import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;

  const booking = await prisma.booking.findUnique({
    where: { id },
    include: { trip: true, plan: true },
  });

  if (!booking) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({
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
      totalBudget: booking.trip.totalBudget ?? undefined,
      currency: booking.trip.currency,
      numberOfTravellers: booking.trip.numberOfTravellers,
      cabinClass: booking.trip.cabinClass,
      hotelStarRating: booking.trip.hotelStarRating,
      locationPreference: booking.trip.locationPreference,
      amenities: JSON.parse(booking.trip.amenities),
      tripPurpose: booking.trip.tripPurpose,
      specialRequirements: booking.trip.specialRequirements,
      loyaltyNumbers: booking.trip.loyaltyNumbers,
    },
    plan: {
      id: booking.plan.id,
      planIndex: booking.plan.planIndex,
      label: booking.plan.label,
      justification: booking.plan.justification,
      flights: JSON.parse(booking.plan.flights),
      hotel: JSON.parse(booking.plan.hotel),
      transfer: booking.plan.transfer ? JSON.parse(booking.plan.transfer) : undefined,
      flightCost: booking.plan.flightCost,
      hotelCost: booking.plan.hotelCost,
      transferCost: booking.plan.transferCost,
      totalCost: booking.plan.totalCost,
    },
  });
}
