import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { generateTravelPlans } from "@/lib/ai";
import { TripFormData } from "@/lib/types";
import { auth } from "@/auth";

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: TripFormData = await req.json();

    // Generate AI plans first
    const plans = await generateTravelPlans(body);

    // Save trip to DB
    const trip = await prisma.trip.create({
      data: {
        userId: session.user.id,
        fullName: body.fullName,
        email: body.email,
        phone: body.phone,
        originCity: body.originCity,
        destinations: JSON.stringify(body.destinations),
        departureDate: body.departureDate,
        returnDate: body.returnDate,
        numberOfNights: body.numberOfNights,
        totalBudget: body.totalBudget,
        currency: body.currency,
        numberOfTravellers: body.numberOfTravellers,
        cabinClass: body.cabinClass,
        preferredAirline: body.preferredAirline ?? null,
        airlineRewards: body.airlineRewards ?? null,
        hotelStarRating: body.hotelStarRating,
        locationPreference: body.locationPreference,
        amenities: JSON.stringify(body.amenities),
        tripPurpose: body.tripPurpose,
        specialRequirements: body.specialRequirements ?? null,
        loyaltyNumbers: body.loyaltyNumbers ?? null,
      },
    });

    // Save plans to DB
    await prisma.plan.createMany({
      data: plans.map((plan) => ({
        tripId: trip.id,
        planIndex: plan.planIndex,
        label: plan.label,
        justification: plan.justification,
        flights: JSON.stringify(plan.flights),
        hotel: JSON.stringify(plan.hotel),
        flightCost: plan.flightCost,
        hotelCost: plan.hotelCost,
        totalCost: plan.totalCost,
        pricesFetchedAt: plan.pricesFetchedAt ?? null,
        sources: JSON.stringify(plan.sources ?? []),
      })),
    });

    return NextResponse.json({ tripId: trip.id, plans });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/trips error:", msg);
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const tripId = req.nextUrl.searchParams.get("tripId");
  if (!tripId) return NextResponse.json({ error: "Missing tripId" }, { status: 400 });

  const trip = await prisma.trip.findUnique({
    where: { id: tripId },
    include: { plans: { orderBy: { planIndex: "asc" } } },
  });

  if (!trip) return NextResponse.json({ error: "Not found" }, { status: 404 });
  if (trip.userId !== session.user.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const plans = trip.plans.map((p) => ({
    id: p.id,
    planIndex: p.planIndex,
    label: p.label,
    justification: p.justification,
    flights: JSON.parse(p.flights),
    hotel: JSON.parse(p.hotel),
    flightCost: p.flightCost,
    hotelCost: p.hotelCost,
    totalCost: p.totalCost,
    pricesFetchedAt: p.pricesFetchedAt,
    sources: p.sources ? JSON.parse(p.sources) : [],
  }));

  return NextResponse.json({
    trip: {
      id: trip.id,
      fullName: trip.fullName,
      email: trip.email,
      phone: trip.phone,
      originCity: trip.originCity,
      destinations: JSON.parse(trip.destinations),
      departureDate: trip.departureDate,
      returnDate: trip.returnDate,
      numberOfNights: trip.numberOfNights,
      totalBudget: trip.totalBudget,
      currency: trip.currency,
      numberOfTravellers: trip.numberOfTravellers,
      cabinClass: trip.cabinClass,
      preferredAirline: trip.preferredAirline,
      hotelStarRating: trip.hotelStarRating,
      locationPreference: trip.locationPreference,
      amenities: JSON.parse(trip.amenities),
      tripPurpose: trip.tripPurpose,
      specialRequirements: trip.specialRequirements,
      loyaltyNumbers: trip.loyaltyNumbers,
    },
    plans,
  });
}
