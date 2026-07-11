import "server-only";
import type { TripFormData, UserProfile, TravelPlan, HotelDetail, FlightDetail, HotelOption } from "@/lib/types";
import { extractIata, cityFor, countryFor } from "@/lib/airports";
import { findAirline } from "@/lib/airlines";
import { searchFlights, type FlightOffer } from "@/lib/providers/amadeus";
import { duffelFlights, duffelPlanSearchEnabled } from "@/lib/providers/duffel";
import { duffelHotels, duffelStaysConfigured } from "@/lib/providers/duffel-stays";
import { getTransferEstimate } from "@/lib/providers/uber";
import { estimateFlights, estimateHotels } from "@/lib/providers/estimate";
import { scrapeFlights } from "@/lib/scrapers/flights";
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
    airlineNote?: string;
  };
}

function addDays(iso: string, days: number): string {
  const d = new Date(iso);
  d.setDate(d.getDate() + days);
  return d.toISOString().slice(0, 10);
}

function placeholderHotel(trip: TripFormData, city: string, checkIn: string, checkOut: string): HotelDetail {
  return {
    name: `${trip.hotelStarRating}★ hotels in ${city}`,
    location: city,
    address: "",
    stars: trip.hotelStarRating,
    nightlyRate: 0,
    totalCost: 0,
    amenities: trip.amenities,
    cancellationPolicy: "Indicative only — live bookable stays shown when available",
    checkIn,
    checkOut,
    bookingLink: "",
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
  const [flightScrape, transferScrape] = scrapingEnabled
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
        scrapeTransfer({ from: `${destination} Airport`, to: destCity, currency: trip.currency }).catch(() => null),
      ])
    : [{ ok: false as const, error: "Scraping disabled" }, null];

  // ── Flights: scraped → Duffel (bookable in Atlas) → Amadeus → estimate ──
  const scrapeWon = flightScrape.ok && flightScrape.data.length > 0;
  const duffelP = duffelPlanSearchEnabled() && !scrapeWon
    ? duffelFlights({
        origin,
        destination,
        departureDate: trip.departureDate,
        returnDate: trip.returnDate || undefined,
        adults: trip.numberOfTravellers,
        cabinClass: trip.cabinClass,
        currency: trip.currency,
      })
    : null;

  let offers: FlightOffer[];
  let flightSource: string;
  const duffel = duffelP ? await duffelP : null;
  if (flightScrape.ok && flightScrape.data.length > 0) {
    offers = flightScrape.data;
    flightSource = "Google Flights (scraped)";
  } else if (duffel?.ok && duffel.data.length > 0) {
    offers = duffel.data;
    flightSource = "Duffel (bookable in Atlas)";
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
      flightSource = "Amadeus";
    } else {
      // No live source available → indicative estimate so the app still works.
      // Every estimated fare links into Atlas's own Duffel flight search to book.
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
        preferredAirline: trip.preferredAirline || undefined,
      });
      flightSource = "Indicative estimate";
      flightsEstimated = true;
    }
  }

  // ── Airline filter: when a preferred airline is chosen, restrict every
  // package to it. Only fall back to other carriers if real results genuinely
  // have none on this route/date (estimated offers always carry the preferred
  // airline, so they're never filtered out).
  let airlineNote: string | undefined;
  const preferred = trip.preferredAirline?.trim();
  if (preferred) {
    const pa = findAirline(preferred);
    const matches = (o: FlightOffer) =>
      o.airlines.some((n) => n.toLowerCase() === preferred.toLowerCase()) ||
      (pa ? o.airlineCodes.includes(pa.code) : false);
    const onPreferred = offers.filter(matches);
    if (onPreferred.length > 0) {
      offers = onPreferred;
    } else if (!flightsEstimated) {
      airlineNote = `No ${preferred} flights available for this route — showing next best option`;
    }
  }

  // ── Hotels: Duffel Stays (live, bookable) → indicative estimate ──
  let liveHotels: HotelOption[] = [];
  let hotelSource = "Indicative estimate";
  let hotelOk = true;
  if (duffelStaysConfigured()) {
    const duffel = await duffelHotels({
      city: destCity,
      checkIn,
      checkOut,
      adults: trip.numberOfTravellers,
      stars: trip.hotelStarRating,
      currency: trip.currency,
      nights: trip.numberOfNights || 1,
    });
    if (duffel.ok && duffel.data.length > 0) {
      liveHotels = duffel.data;
      hotelSource = "Duffel Stays (bookable in Atlas)";
      hotelOk = true;
    }
  }
  if (liveHotels.length === 0) {
    // Fallback to indicative estimate (real affiliate link to confirm & book a real one).
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

  // ── Rank hotels: QUALITY first (review score + stars), then price within
  // budget. The target user is a business executive, so even the cheapest
  // package picks a well-reviewed quality hotel, not a budget room. ──
  const minStars = Math.max(3, trip.hotelStarRating || 4);
  const MIN_REVIEW = 8.0;
  // Single total budget acts as a loose upper bound on the hotel component.
  const hotelBudget = trip.totalBudget && trip.totalBudget > 0 ? trip.totalBudget : undefined;

  // Prefer hotels meeting the quality bar; if none do, fall back to the best
  // available by review so we never show a poor hotel.
  const meetsBar = liveHotels.filter((h) => h.stars >= minStars && (h.rating ?? 0) >= MIN_REVIEW);
  const qualityPool =
    meetsBar.length > 0
      ? meetsBar
      : [...liveHotels].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0)).slice(0, 6);

  // Respect the hotel budget if set, but never drop below the quality pool.
  const withinBudget = hotelBudget ? qualityPool.filter((h) => h.totalCost <= hotelBudget) : qualityPool;
  const pool = withinBudget.length > 0 ? withinBudget : qualityPool;

  // Quality score (higher is better): review score dominates, stars second.
  const reviewN = valueRank(pool, (h) => -(h.rating ?? 0)); // 0 = best reviewed
  const starN = valueRank(pool, (h) => -h.stars);
  const priceN = valueRank(pool, (h) => h.totalCost); // 0 = cheapest
  const qualityScore = pool.map((_, i) => 0.6 * reviewN[i] + 0.4 * starN[i]); // lower = better

  const byQuality = [...pool].sort(
    (a, b) => qualityScore[pool.indexOf(a)] - qualityScore[pool.indexOf(b)]
  );
  const byRating = [...pool].sort((a, b) => (b.rating ?? 0) - (a.rating ?? 0));
  const cheapestQuality = [...pool].sort((a, b) => a.totalCost - b.totalCost);
  const flexible = pool.find((h) => /free cancellation|refundable/i.test(h.cancellationPolicy));
  // Best value = quality with mild price weighting, still quality-led.
  const byValue = [...pool].sort((a, b) => {
    const sa = 0.7 * qualityScore[pool.indexOf(a)] + 0.3 * priceN[pool.indexOf(a)];
    const sb = 0.7 * qualityScore[pool.indexOf(b)] + 0.3 * priceN[pool.indexOf(b)];
    return sa - sb;
  });

  function hotelFor(i: number): HotelDetail {
    if (pool.length === 0) return placeholderHotel(trip, destCity, checkIn, checkOut);
    const pick =
      i === 0 ? cheapestQuality[0] // lowest cost — but still from the quality pool
      : i === 1 ? byQuality[0] // fastest travel pairs with a top central hotel
      : i === 2 ? byRating[0] // best rated
      : i === 3 ? (flexible ?? byQuality[0]) // most flexible
      : byValue[0]; // best overall value
    return hotelFromOption(pick, checkIn, checkOut);
  }

  const unavailableShared: string[] = [];
  if (flightsEstimated)
    unavailableShared.push("Flight prices are indicative estimates — confirm the live fare when you book in Atlas.");
  if (hotelsEstimated)
    unavailableShared.push("Hotel prices are indicative — live, bookable stays are shown for supported destinations.");
  if (!hotelOk && !hotelsEstimated)
    unavailableShared.push("Live hotel prices unavailable for this destination right now.");
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
      airlineNote,
    },
  };
}
