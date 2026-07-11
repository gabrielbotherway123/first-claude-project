import "server-only";
import type { FlightDetail, HotelOption } from "@/lib/types";
import { AIRLINES, nationalCarrier, findAirline, type Airline } from "@/lib/airlines";
import type { FlightOffer } from "@/lib/providers/amadeus";

/**
 * Internal deep-link into Atlas's own Duffel flight search, pre-filled and set to
 * auto-search. Even when the displayed price is an indicative estimate, clicking
 * through runs a live Duffel search and books inside Atlas — never a third party.
 */
function flightsLink(opts: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  cabinClass: "economy" | "premium_economy" | "business" | "first";
}): string {
  const qs = new URLSearchParams({
    origin: opts.origin,
    destination: opts.destination,
    depart: opts.departureDate,
    adults: String(opts.adults),
    cabin: opts.cabinClass,
    autoSearch: "true",
  });
  if (opts.returnDate) qs.set("return", opts.returnDate);
  return `/flights?${qs.toString()}`;
}

// ─── No-key indicative engine ───────────────────────────────────────────────
// Produces plausible itineraries from real airlines/airports plus a fare model,
// so the app always returns results without any API key or scraping. Prices are
// ESTIMATES — every result links out to the real site to confirm and book.

// Country → continent (covers the countries in the bundled airport dataset).
const CONTINENT: Record<string, string> = {
  "United Kingdom": "EU", Ireland: "EU", France: "EU", Germany: "EU", Netherlands: "EU",
  Belgium: "EU", Spain: "EU", Portugal: "EU", Italy: "EU", Switzerland: "EU", Austria: "EU",
  Denmark: "EU", Sweden: "EU", Norway: "EU", Finland: "EU", Greece: "EU", Turkey: "EU",
  Russia: "EU", Poland: "EU", Czechia: "EU",
  "United States": "NA", Canada: "NA", Mexico: "NA",
  "United Arab Emirates": "ME", Qatar: "ME", "Saudi Arabia": "ME", Israel: "ME", Egypt: "ME",
  Japan: "AS", "South Korea": "AS", China: "AS", "Hong Kong": "AS", Taiwan: "AS",
  Singapore: "AS", Thailand: "AS", Malaysia: "AS", Indonesia: "AS", Philippines: "AS", India: "AS",
  Australia: "OC", "New Zealand": "OC",
  "South Africa": "AF", Kenya: "AF", Nigeria: "AF", Ethiopia: "AF",
  Brazil: "SA", Argentina: "SA", Chile: "SA", Colombia: "SA",
};

// Units per 1 USD — rough, indicative only.
const FX: Record<string, number> = {
  USD: 1, GBP: 0.79, EUR: 0.92, CHF: 0.88, SGD: 1.34, AED: 3.67,
  JPY: 150, AUD: 1.52, NZD: 1.66, CAD: 1.36,
};

const CABIN_MULT: Record<string, number> = {
  economy: 1,
  premium_economy: 1.6,
  business: 3.2,
  first: 5,
};

// Primary hub per major carrier — used to name the connecting airport on any
// estimated one-stop itinerary so a non-direct flight always says where it stops.
const CARRIER_HUB: Record<string, string> = {
  EK: "DXB", EY: "AUH", QR: "DOH", SV: "RUH", TK: "IST", QF: "SYD", NZ: "AKL",
  SQ: "SIN", CX: "HKG", CI: "TPE", NH: "HND", JL: "HND", KE: "ICN", TG: "BKK",
  MH: "KUL", GA: "CGK", BA: "LHR", VS: "LHR", AF: "CDG", KL: "AMS", LH: "FRA",
  LX: "ZRH", OS: "VIE", IB: "MAD", AZ: "FCO", SK: "CPH", AY: "HEL", EI: "DUB",
  UA: "SFO", AA: "DFW", DL: "ATL", AC: "YYZ", ET: "ADD", SA: "JNB", QF2: "SYD",
};

interface Band {
  usd: number; // economy return per person
  hours: number;
  stops: number;
}

function band(c1?: string, c2?: string): Band {
  const a = (c1 && CONTINENT[c1]) || "EU";
  const b = (c2 && CONTINENT[c2]) || "EU";
  if (c1 && c2 && c1 === c2) return { usd: 140, hours: 1.8, stops: 0 };
  if (a === b) return { usd: 240, hours: 2.8, stops: 0 };

  const pair = [a, b].sort().join("-");
  const ultra = ["AS-OC", "EU-OC", "NA-OC", "AF-OC", "OC-SA", "AF-SA", "AS-SA", "EU-SA"];
  const medium = ["AS-ME", "AF-EU", "EU-ME", "AF-ME", "NA-SA", "ME-NA"];
  if (ultra.includes(pair)) return { usd: 1500, hours: 22, stops: 1 };
  if (medium.includes(pair)) return { usd: 650, hours: 7, stops: 0 };
  return { usd: 1100, hours: 12, stops: 1 }; // long-haul default (e.g. EU↔NA, EU↔AS)
}

function fx(currency: string): number {
  return FX[currency] ?? 1;
}
function round5(n: number): number {
  return Math.round(n / 5) * 5;
}
function hashNum(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) >>> 0;
  return (h % 900) + 100;
}
function addHours(iso: string, hour: number, addH: number): { date: string; time: string } {
  const d = new Date(`${iso}T00:00:00`);
  d.setHours(hour + Math.round(addH));
  const time = `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
  return { date: d.toISOString().slice(0, 10), time };
}
function hours(h: number): string {
  const hh = Math.floor(h);
  const mm = Math.round((h - hh) * 60);
  return `${hh}h ${String(mm).padStart(2, "0")}m`;
}

function leg(opts: {
  airline: Airline;
  origin: string;
  destination: string;
  date: string;
  depHour: number;
  durH: number;
  stops: number;
  hub: string; // connecting airport when stops > 0
  price: number;
  isReturn: boolean;
  bookingLink: string;
}): FlightDetail {
  const arr = addHours(opts.date, opts.depHour, opts.durH);
  return {
    airline: opts.airline.name,
    flightNumber: `${opts.airline.code}${hashNum(opts.origin + opts.destination + (opts.isReturn ? "R" : "O"))}`,
    departure: {
      airport: opts.origin,
      time: `${String(opts.depHour).padStart(2, "0")}:00`,
      date: opts.date,
    },
    arrival: { airport: opts.destination, time: arr.time, date: arr.date },
    layovers: Array.from({ length: opts.stops }, () => ({ airport: opts.hub, duration: "1h 30m" })),
    duration: hours(opts.durH),
    price: Math.round(opts.price),
    isReturn: opts.isReturn,
    bookingLink: opts.bookingLink,
  };
}

export function estimateFlights(params: {
  origin: string;
  destination: string;
  departureDate: string;
  returnDate?: string;
  adults: number;
  children?: number;
  cabinClass: "economy" | "premium_economy" | "business" | "first";
  currency: string;
  originCountry?: string;
  destinationCountry?: string;
  preferredAirline?: string;
  directOnly?: boolean;
}): FlightOffer[] {
  const b = band(params.originCountry, params.destinationCountry);
  const rate = fx(params.currency);
  const cabin = CABIN_MULT[params.cabinClass] ?? 1;
  const roundTrip = Boolean(params.returnDate);
  const tripFactor = roundTrip ? 1 : 0.6;
  const basePerPerson = b.usd * cabin * tripFactor * rate;
  const children = params.children ?? 0;

  // When a preferred airline is set, every estimated option flies that carrier.
  const forced = params.preferredAirline ? findAirline(params.preferredAirline) : undefined;
  const primary = forced ?? nationalCarrier(params.originCountry) ?? AIRLINES[0];
  const secondary = forced ?? nationalCarrier(params.destinationCountry) ?? AIRLINES[1];
  const premium =
    forced ?? AIRLINES.find((a) => ["EK", "QR", "SQ", "CX"].includes(a.code)) ?? primary;

  const link = flightsLink({
    origin: params.origin,
    destination: params.destination,
    departureDate: params.departureDate,
    returnDate: params.returnDate,
    adults: params.adults,
    cabinClass: params.cabinClass,
  });

  // 5 indicative variants the package builder can rank.
  const variants = [
    { carrier: secondary, priceMult: 0.85, durMult: 1.2, depHour: 6, stops: b.stops + 1, refundable: false },
    { carrier: primary, priceMult: 1.15, durMult: 0.9, depHour: 9, stops: Math.max(0, b.stops), refundable: false },
    { carrier: primary, priceMult: 1.0, durMult: 1.0, depHour: 11, stops: b.stops, refundable: false },
    { carrier: primary, priceMult: 1.35, durMult: 1.0, depHour: 8, stops: b.stops, refundable: true },
    { carrier: premium, priceMult: 1.2, durMult: 0.95, depHour: 22, stops: Math.max(0, b.stops), refundable: false },
  ];

  return variants.map((v) => {
    const hub = CARRIER_HUB[v.carrier.code] ?? "";
    // Prefer direct when requested. We also never invent a connection we can't
    // name: with no known hub for the carrier, the leg is shown as non-stop and
    // priced with a small direct premium.
    const forcedDirect = params.directOnly || !hub;
    const stops = forcedDirect ? 0 : v.stops;
    const priceMult = v.priceMult * (forcedDirect && v.stops > 0 ? 1.18 : 1);
    const pricePerAdult = round5(basePerPerson * priceMult);
    // Children priced at ~75% of the adult fare.
    const total = pricePerAdult * (params.adults + children * 0.75);
    const durH = b.hours * v.durMult * (forcedDirect && v.stops > 0 ? 0.82 : 1);
    const flights: FlightDetail[] = [
      leg({
        airline: v.carrier, origin: params.origin, destination: params.destination,
        date: params.departureDate, depHour: v.depHour, durH, stops, hub,
        price: roundTrip ? total / 2 : total, isReturn: false, bookingLink: link,
      }),
    ];
    if (roundTrip && params.returnDate) {
      flights.push(
        leg({
          airline: v.carrier, origin: params.destination, destination: params.origin,
          date: params.returnDate, depHour: 18, durH, stops, hub,
          price: total / 2, isReturn: true, bookingLink: link,
        })
      );
    }
    return {
      flights,
      price: total,
      currency: params.currency,
      airlines: [v.carrier.name],
      airlineCodes: [v.carrier.code],
      refundable: v.refundable,
      durationMinutes: Math.round(durH * 60) * (roundTrip ? 2 : 1),
      bookingLink: link,
    };
  });
}

export function estimateHotels(params: {
  city: string;
  checkIn: string;
  checkOut: string;
  adults: number;
  stars: number;
  currency: string;
  nights: number;
}): HotelOption[] {
  const rate = fx(params.currency);
  const baseUsd = params.stars >= 5 ? 280 : params.stars >= 4 ? 170 : 110;
  const nights = params.nights || 1;
  // Estimate hotels are indicative only — there's no live Duffel accommodation to
  // book, so no link. Live, bookable stays come from the Duffel Stays provider.
  const link = "";

  // Business-quality tiers — all well-reviewed (8.0+) and central.
  const tiers = [
    { mult: 0.92, rating: 8.2, label: "Business", cancel: "Free cancellation available on most rooms" },
    { mult: 1.1, rating: 8.7, label: "Executive", cancel: "Free cancellation available on most rooms" },
    { mult: 1.35, rating: 9.2, label: "Premier", cancel: "Check cancellation terms when booking" },
  ];

  return tiers.map((t) => {
    const nightly = round5(baseUsd * t.mult * rate);
    return {
      name: `${params.stars}-star ${t.label} stay · ${params.city}`,
      location: `${params.city} (central business district)`,
      address: "",
      stars: params.stars,
      nightlyRate: nightly,
      totalCost: nightly * nights,
      amenities: ["High-speed WiFi", "Work desk", "Gym", "Room service"],
      rating: t.rating,
      cancellationPolicy: t.cancel,
      bookingLink: link,
    };
  });
}
