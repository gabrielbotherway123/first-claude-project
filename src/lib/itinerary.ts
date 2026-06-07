import "server-only";
import type { TripFormData, UserProfile, TravelPlan, HotelDetail, FlightDetail } from "@/lib/types";
import { extractIata, cityFor, countryFor } from "@/lib/airports";
import { searchFlights, type FlightOffer } from "@/lib/providers/amadeus";
import { searchHotels, bookingSearchLink, type HotelOption } from "@/lib/providers/booking";
import { getTransferEstimate } from "@/lib/providers/uber";
import { estimateFlights, estimateHotels } from "@/lib/providers/estimate";
import { scrapeFlights } from "@/lib/scrapers/flights";
import { scrapeHotels } from "@/lib/scrapers/hotels";
import { scrapeTransfer } from "@/lib/scrapers/transport";

const PLAN_META = [
  { label: "Lowest Total Cost", emphasis: "the cheapest flight + hotel combination" },
  { label: "Fastest Travel", emphasis: "the shortest journey and a central hotel" },
  { label: "Best Rated", emphasis: "the highest-reviewed hotel" },
  { label: "Most Flexible", emphasis: "refundable, cancellable options" },
  { label: "Best Overall Value", emphasis: "the best balance of price, rating and time" },
];

export interface ItineraryResult {
  plans: TravelPlan[];
  fetchedAt: string;
  status: {
    flights: { source: string };
    hotels: { source: string; ok: boolean };
    transfer: { source: string; live: boolean };
  };
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function placeholderHotel(trip: TripFormData, city: string, checkIn: string, checkOut: string): HotelDetail {
  return {
    name: `Browse ${trip.hotelStarRating}★ hotels in ${city}`,
    location: city,
    address: "",
    stars: trip.hotelStarRating,
    nightlyRate: 0,
    totalCost: 0,
    amenities: trip.amenities,
    cancellationPolicy: "Live availability unavailable — open Booking.com to see options",
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

// Normalised 0-1 (lower is better) value score over a numeric field.
function valueRank<T>(items: T[], get: (t: T) => number): number[] {
  const vals = items.map(get);
  const min = Math.min(...vals);
  const max = Math.max(...vals);
  const span = max - min || 1;
  return vals.map((v) => (v - min) / span);
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
  const originCountry = countryFor(trip.originCity);
  const destinationCountry = countryFor(trip.destinations[0]);
  let flightsEstimated = false;
  let hotelsEstimated = false;

  // Scraping is opt-in (ENABLE_SCRAPING=true): it's slow and usually blocked, so
  // by default we skip straight to the API/estimate path for an instant result.
  const scrapingEnabled = process.env.ENABLE_SCRAPING === "true";
  const [flightScrape, hotelScrape, transferScrape] = scrapingEnabled
    ? await Promise.all([
        scrapeFlights({
          origin,
          destination,
          departureDate: trip.departureDate,
          returnDate: trip.returnDate || undefined,
          adults: trip.numberOfTravellers,
          cabinClass: trip.cabinClass,
          currency: trip.currency,
        }).catch((e) => ({ ok: false as const, error: String(e) })),
        scrapeHotels({
          city: destCity,
          checkIn,
          checkOut,
          adults: trip.numberOfTravellers,
          stars: trip.hotelStarRating,
          currency: trip.currency,
          nights: trip.numberOfNights || 1,
        }).catch((e) => ({ ok: false as const, error: String(e) })),
        scrapeTransfer({ from: `${destination} Airport`, to: destCity, currency: trip.currency }).catch(() => null),
      ])
    : [{ ok: false as const, error: "Scraping disabled" }, { ok: false as const, error: "Scraping disabled" }, null];

  // ── Flights: scraped → Amadeus fallback → fail ──
  let offers: FlightOffer[];
  let flightSource: string;
  if (flightScrape.ok && flightScrape.data.length > 0) {
    offers = flightScrape.data;
    flightSource = "Google Flights (scraped)";
  } else {
    const api = await searchFlights({
      origin,
      destination,
      departureDate: trip.departureDate,
      returnDate: trip.returnDate || undefined,
      adults: trip.numberOfTravellers,
      cabinClass: trip.cabinClass,
      currency: trip.currency,
    });
    if (api.ok && api.data.length > 0) {
      offers = api.data;
      flightSource = "Amadeus (fallback)";
    } else {
      // No key + scrape blocked → indicative estimate so the app still works.
      offers = estimateFlights({
        origin,
        destination,
        departureDate: trip.departureDate,
        returnDate: trip.returnDate || undefined,
        adults: trip.numberOfTravellers,
        cabinClass: trip.cabinClass,
        currency: trip.currency,
        originCountry,
        destinationCountry,
      });
      flightSource = "Indicative estimate";
      flightsEstimated = true;
    }
  }

  // ── Hotels: scraped → Booking API fallback → affiliate placeholder ──
  let liveHotels: HotelOption[] = [];
  let hotelSource: string;
  let hotelOk = true;
  if (hotelScrape.ok && hotelScrape.data.length > 0) {
    liveHotels = hotelScrape.data;
    hotelSource = "Booking.com (scraped)";
  } else {
    const api = await searchHotels({
      city: destCity,
      checkIn,
      checkOut,
      adults: trip.numberOfTravellers,
      stars: trip.hotelStarRating,
      currency: trip.currency,
      nights: trip.numberOfNights || 1,
    });
    if (api.ok && api.data.length > 0) {
      liveHotels = api.data;
      hotelSource = "Booking.com (API)";
    } else {
      // Indicative hotels (real affiliate link to confirm & book a real one).
      liveHotels = estimateHotels({
        city: destCity,
        checkIn,
        checkOut,
        adults: trip.numberOfTravellers,
        stars: trip.hotelStarRating,
        currency: trip.currency,
        nights: trip.numberOfNights || 1,
      });
      hotelOk = false;
      hotelsEstimated = true;
      hotelSource = "Indicative estimate";
    }
  }

  // ── Transfer: scraped → heuristic ──
  const transfer =
    transferScrape ??
    (await getTransferEstimate({ from: `${destination} Airport`, to: destCity, currency: trip.currency }));
  const transferSource = transferScrape ? "Google Maps (scraped)" : transfer.live ? "Uber" : "Estimate";

  // ── Rank flights ──
  const byCost = [...offers].sort((a, b) => a.price - b.price);
  const byDuration = [...offers].sort((a, b) => a.durationMinutes - b.durationMinutes);
  const refundableOffers = offers.filter((o) => o.refundable);
  const priceRank = valueRank(offers, (o) => o.price);
  const durRank = valueRank(offers, (o) => o.durationMinutes || 0);
  const valueScored = offers
    .map((o, i) => ({ o, score: 0.6 * priceRank[i] + 0.4 * durRank[i] }))
    .sort((a, b) => a.score - b.score);

  const offerFor: FlightOffer[] = [
    byCost[0],
    byDuration[0],
    byCost[0],
    refundableOffers[0] ?? byCost[0],
    valueScored[0].o,
  ];

  // ── Rank hotels ──
  const hotelByPrice = [...liveHotels].sort((a, b) => a.totalCost - b.totalCost);
  const hotelByRating = [...liveHotels].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const hotelFlexible = liveHotels.find((h) => /free cancellation|refundable/i.test(h.cancellationPolicy));
  const hotelValue = (() => {
    if (liveHotels.length === 0) return undefined;
    const hp = valueRank(liveHotels, (h) => h.totalCost);
    const hr = valueRank(liveHotels, (h) => -(h.rating ?? 0));
    return [...liveHotels]
      .map((h, i) => ({ h, score: 0.5 * hp[i] + 0.5 * hr[i] }))
      .sort((a, b) => a.score - b.score)[0].h;
  })();

  function hotelFor(i: number): HotelDetail {
    if (liveHotels.length === 0) return placeholderHotel(trip, destCity, checkIn, checkOut);
    const pick =
      i === 0 ? hotelByPrice[0]
      : i === 1 ? hotelByPrice[0]
      : i === 2 ? hotelByRating[0]
      : i === 3 ? (hotelFlexible ?? hotelByPrice[0])
      : (hotelValue ?? hotelByPrice[0]);
    return hotelFromOption(pick, checkIn, checkOut);
  }

  const unavailableShared: string[] = [];
  if (flightsEstimated)
    unavailableShared.push("Flight prices are indicative estimates — confirm the live fare via the booking link.");
  if (hotelsEstimated)
    unavailableShared.push("Hotel prices are indicative — open the Booking.com link to pick and confirm a real hotel.");
  if (!hotelOk && !hotelsEstimated)
    unavailableShared.push("Live hotel prices unavailable — showing Booking.com search links.");
  if (!transfer.live)
    unavailableShared.push("Transfer fare is an approximate estimate.");

  const sources = [flightSource, hotelSource, transferSource];

  const plans: TravelPlan[] = PLAN_META.map((meta, i) => {
    const offer = offerFor[i] ?? byCost[0];
    const hotel = hotelFor(i);
    const flights: FlightDetail[] = offer.flights;
    const flightCost = offer.price;
    const hotelCost = hotel.totalCost;
    const transferCost = transfer.amount;

    return {
      planIndex: i,
      label: meta.label,
      justification: `Optimised for ${meta.emphasis}.`,
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
      flights: { source: flightSource },
      hotels: { source: hotelSource, ok: hotelOk },
      transfer: { source: transferSource, live: transfer.live },
    },
  };
}
