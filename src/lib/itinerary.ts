import "server-only";
import type { TripFormData, UserProfile, TravelPlan, HotelDetail, FlightDetail } from "@/lib/types";
import { extractIata, cityFor } from "@/lib/airports";
import { searchFlights, type FlightOffer } from "@/lib/providers/amadeus";
import { searchHotels, bookingSearchLink, type HotelOption } from "@/lib/providers/booking";
import { getTransferEstimate } from "@/lib/providers/uber";

const PLAN_META = [
  { label: "Lowest Total Cost", emphasis: "the cheapest overall combination" },
  { label: "Fastest Route", emphasis: "the shortest total travel time" },
  { label: "Highest Rated Hotel", emphasis: "the best-reviewed accommodation" },
  { label: "Most Flexible", emphasis: "refundable, cancellable options" },
  { label: "Loyalty Match", emphasis: "your preferred airline & rewards" },
];

export interface ItineraryResult {
  plans: TravelPlan[];
  fetchedAt: string;
  status: {
    flights: { ok: boolean; error?: string };
    hotels: { ok: boolean; error?: string };
    transfer: { live: boolean };
  };
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function placeholderHotel(
  trip: TripFormData,
  city: string,
  checkIn: string,
  checkOut: string
): HotelDetail {
  return {
    name: `Browse ${trip.hotelStarRating}★ hotels in ${city}`,
    location: city,
    address: "",
    stars: trip.hotelStarRating,
    nightlyRate: 0,
    totalCost: 0,
    amenities: trip.amenities,
    cancellationPolicy: "Live availability pending Booking.com partner approval",
    checkIn,
    checkOut,
    bookingLink: bookingSearchLink({
      city,
      checkIn,
      checkOut,
      adults: trip.numberOfTravellers,
      stars: trip.hotelStarRating,
    }),
  };
}

function hotelFromOption(o: HotelOption, checkIn: string, checkOut: string): HotelDetail {
  return {
    name: o.name,
    location: o.location,
    address: o.address,
    stars: o.stars,
    nightlyRate: o.nightlyRate,
    totalCost: o.totalCost,
    amenities: o.amenities,
    rating: o.rating,
    cancellationPolicy: o.cancellationPolicy,
    checkIn,
    checkOut,
    bookingLink: o.bookingLink,
  };
}

export async function buildItineraries(
  trip: TripFormData,
  profile: UserProfile
): Promise<ItineraryResult> {
  const fetchedAt = new Date().toISOString();

  const origin = extractIata(trip.originCity);
  const destination = extractIata(trip.destinations[0] ?? "");
  if (!origin || !destination) {
    throw new Error("Please select airports from the suggestions so we have valid IATA codes.");
  }

  const checkIn = trip.departureDate;
  const checkOut = trip.returnDate || addDays(trip.departureDate, trip.numberOfNights || 1);
  const destCity = cityFor(trip.destinations[0]);

  // 1. Flights (backbone — required).
  const flightRes = await searchFlights({
    origin,
    destination,
    departureDate: trip.departureDate,
    returnDate: trip.returnDate || undefined,
    adults: trip.numberOfTravellers,
    cabinClass: trip.cabinClass,
    currency: trip.currency,
  });

  if (!flightRes.ok) {
    throw new Error(flightRes.error);
  }
  const offers = flightRes.data;
  if (offers.length === 0) {
    throw new Error("No flights were found for that route and date. Try different dates or airports.");
  }

  // 2. Hotels (best-effort).
  const hotelRes = await searchHotels({
    city: destCity,
    checkIn,
    checkOut,
    adults: trip.numberOfTravellers,
    stars: trip.hotelStarRating,
    currency: trip.currency,
    nights: trip.numberOfNights || 1,
  });
  const liveHotels = hotelRes.ok ? hotelRes.data : [];

  // 3. Transfer (Uber or heuristic).
  const transfer = await getTransferEstimate({
    from: `${destination} airport`,
    to: destCity,
    currency: trip.currency,
  });

  // Pick a distinct flight offer per package emphasis.
  const byCost = [...offers].sort((a, b) => a.price - b.price);
  const byDuration = [...offers].sort((a, b) => a.durationMinutes - b.durationMinutes);
  const refundable = offers.filter((o) => o.refundable);
  const preferred = (trip.preferredAirline || profile.preferredAirlines[0]?.airline || "").toLowerCase();
  const byLoyalty = [...offers].sort((a, b) => {
    const am = a.airlines.some((n) => n.toLowerCase() === preferred) ? 0 : 1;
    const bm = b.airlines.some((n) => n.toLowerCase() === preferred) ? 0 : 1;
    return am - bm || a.price - b.price;
  });

  const offerFor: FlightOffer[] = [
    byCost[0],
    byDuration[0],
    byCost[0], // highest-rated-hotel package keeps a sensible (cheapest) flight
    (refundable[0] ?? byCost[0]),
    byLoyalty[0],
  ];

  // Pick hotels per package (live data if available, else placeholder).
  const hotelByRating = [...liveHotels].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const hotelByPrice = [...liveHotels].sort((a, b) => a.totalCost - b.totalCost);
  const hotelFlexible = liveHotels.find((h) => /free cancellation/i.test(h.cancellationPolicy));

  function hotelFor(i: number): HotelDetail {
    if (liveHotels.length === 0) return placeholderHotel(trip, destCity, checkIn, checkOut);
    const pick =
      i === 0 ? hotelByPrice[0]
      : i === 2 ? hotelByRating[0]
      : i === 3 ? (hotelFlexible ?? hotelByPrice[0])
      : hotelByRating[0] ?? hotelByPrice[0];
    return hotelFromOption(pick, checkIn, checkOut);
  }

  const unavailableShared: string[] = [];
  if (!hotelRes.ok) unavailableShared.push(`Live hotels — ${hotelRes.error}`);
  if (!transfer.live) unavailableShared.push("Live transfer fare (showing approximate estimate)");

  const sources = [
    "Amadeus",
    hotelRes.ok ? "Booking.com" : "Booking.com (affiliate links)",
    transfer.live ? "Uber" : "Estimate",
  ];

  const plans: TravelPlan[] = PLAN_META.map((meta, i) => {
    const offer = offerFor[i] ?? byCost[0];
    const hotel = hotelFor(i);
    const flightCost = offer.price;
    const hotelCost = hotel.totalCost;
    const transferCost = transfer.amount;
    const flights: FlightDetail[] = offer.flights;

    const note =
      i === 4 && preferred
        ? `Prioritises ${trip.preferredAirline || profile.preferredAirlines[0]?.airline}.`
        : "";

    return {
      planIndex: i,
      label: meta.label,
      justification: `Optimised for ${meta.emphasis}. ${note}`.trim(),
      flights,
      hotel,
      transfer,
      flightCost,
      hotelCost,
      transferCost,
      totalCost: flightCost + hotelCost + transferCost,
      pricesFetchedAt: fetchedAt,
      sources,
      unavailable: unavailableShared,
    };
  });

  return {
    plans,
    fetchedAt,
    status: {
      flights: { ok: true },
      hotels: { ok: hotelRes.ok, error: hotelRes.ok ? undefined : hotelRes.error },
      transfer: { live: transfer.live },
    },
  };
}
