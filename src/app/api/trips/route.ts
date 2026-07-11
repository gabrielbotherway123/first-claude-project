import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildItineraries } from "@/lib/itinerary";
import { TripFormData, UserProfile, PreferredAirline } from "@/lib/types";
import { auth } from "@/auth";

function parseArr<T>(v: string | null): T[] {
  if (!v) return [];
  try {
    const p = JSON.parse(v);
    return Array.isArray(p) ? p : [];
  } catch {
    return [];
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body: TripFormData = await req.json();

    // Load the user's saved preferences for loyalty matching.
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const profile: UserProfile = {
      id: session.user.id,
      name: user?.name ?? body.fullName,
      email: user?.email ?? body.email,
      image: user?.image ?? null,
      phone: user?.phone ?? body.phone,
      defaultAirports: parseArr<string>(user?.defaultAirports ?? null),
      preferredAirlines: parseArr<PreferredAirline>(user?.preferredAirlines ?? null),
      defaultCabinClass: (user?.defaultCabinClass as UserProfile["defaultCabinClass"]) ?? "",
      defaultHotelStars: user?.defaultHotelStars ?? null,
      defaultLocationPreference:
        (user?.defaultLocationPreference as UserProfile["defaultLocationPreference"]) ?? "",
      defaultAmenities: parseArr<string>(user?.defaultAmenities ?? null),
      standingRequirements: user?.standingRequirements ?? "",
    };

    // Build itineraries from live travel APIs (no AI).
    const { plans, status } = await buildItineraries(body, profile);

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
        totalBudget: body.totalBudget ?? null,
        currency: body.currency,
        numberOfTravellers: body.numberOfTravellers,
        numberOfChildren: body.numberOfChildren ?? 0,
        cabinClass: body.cabinClass,
        preferredAirline: body.preferredAirline ?? null,
        airlineRewards: body.airlineRewards ?? null,
        airlineNote: status.airlineNote ?? null,
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
        transfer: plan.transfer ? JSON.stringify(plan.transfer) : null,
        flightCost: plan.flightCost,
        hotelCost: plan.hotelCost,
        transferCost: plan.transferCost,
        totalCost: plan.totalCost,
        pricesFetchedAt: plan.pricesFetchedAt ?? null,
        sources: JSON.stringify(plan.sources ?? []),
        dataNotes: JSON.stringify(plan.unavailable ?? []),
      })),
    });

    return NextResponse.json({ tripId: trip.id, plans, status });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Unknown error";
    console.error("POST /api/trips error:", msg);
    return NextResponse.json({ error: msg }, { status: 502 });
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
    transfer: p.transfer ? JSON.parse(p.transfer) : undefined,
    flightCost: p.flightCost,
    hotelCost: p.hotelCost,
    transferCost: p.transferCost,
    totalCost: p.totalCost,
    pricesFetchedAt: p.pricesFetchedAt,
    sources: p.sources ? JSON.parse(p.sources) : [],
    unavailable: p.dataNotes ? JSON.parse(p.dataNotes) : [],
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
      numberOfChildren: trip.numberOfChildren,
      cabinClass: trip.cabinClass,
      preferredAirline: trip.preferredAirline,
      airlineNote: trip.airlineNote,
      hotelStarRating: trip.hotelStarRating,
      locationPreference: trip.locationPreference,
      amenities: JSON.parse(trip.amenities),
      tripPurpose: trip.tripPurpose,
      specialRequirements: trip.specialRequirements,
      loyaltyNumbers: trip.loyaltyNumbers,
    },
    plans,
    config: {
      flightsConfigured: Boolean(process.env.DUFFEL_ACCESS_TOKEN),
      flightsLiveMode: (process.env.DUFFEL_ACCESS_TOKEN ?? "").startsWith("duffel_live_"),
      hotelsConfigured: Boolean(process.env.DUFFEL_ACCESS_TOKEN),
    },
  });
}
