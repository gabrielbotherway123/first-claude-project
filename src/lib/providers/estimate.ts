import "server-only";
import type { FlightDetail } from "@/lib/types";
import { AIRLINES, nationalCarrier, type Airline } from "@/lib/airlines";
import { bookingSearchLink, type HotelOption } from "@/lib/providers/booking";
import type { FlightOffer } from "@/lib/providers/amadeus";

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

const CABIN_MULT: Record<string, number> = { economy: 1, business: 3.2, first: 5 };

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
    layovers: Array.from({ length: opts.stops }, () => ({ airport: "—", duration: "1h 30m" })),
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
  cabinClass: "economy" | "business" | "first";
  currency: string;
  originCountry?: string;
  destinationCountry?: string;
}): FlightOffer[] {
  const b = band(params.originCountry, params.destinationCountry);
  const rate = fx(params.currency);
  const cabin = CABIN_MULT[params.cabinClass] ?? 1;
  const roundTrip = Boolean(params.returnDate);
  const tripFactor = roundTrip ? 1 : 0.6;
  const basePerPerson = b.usd * cabin * tripFactor * rate;

  const primary = nationalCarrier(params.originCountry) ?? AIRLINES[0];
  const secondary = nationalCarrier(params.destinationCountry) ?? AIRLINES[1];
  const premium =
    AIRLINES.find((a) => ["EK", "QR", "SQ", "CX"].includes(a.code)) ?? primary;

  const link = `https://www.google.com/travel/flights?q=${encodeURIComponent(
    `Flights from ${params.origin} to ${params.destination} on ${params.departureDate}`
  )}`;

  // 5 indicative variants the package builder can rank.
  const variants = [
    { carrier: secondary, priceMult: 0.85, durMult: 1.2, depHour: 6, stops: b.stops + 1, refundable: false },
    { carrier: primary, priceMult: 1.15, durMult: 0.9, depHour: 9, stops: Math.max(0, b.stops), refundable: false },
    { carrier: primary, priceMult: 1.0, durMult: 1.0, depHour: 11, stops: b.stops, refundable: false },
    { carrier: primary, priceMult: 1.35, durMult: 1.0, depHour: 8, stops: b.stops, refundable: true },
    { carrier: premium, priceMult: 1.2, durMult: 0.95, depHour: 22, stops: Math.max(0, b.stops), refundable: false },
  ];

  return variants.map((v) => {
    const pricePerPerson = round5(basePerPerson * v.priceMult);
    const total = pricePerPerson * params.adults;
    const durH = b.hours * v.durMult;
    const flights: FlightDetail[] = [
      leg({
        airline: v.carrier, origin: params.origin, destination: params.destination,
        date: params.departureDate, depHour: v.depHour, durH, stops: v.stops,
        price: roundTrip ? total / 2 : total, isReturn: false, bookingLink: link,
      }),
    ];
    if (roundTrip && params.returnDate) {
      flights.push(
        leg({
          airline: v.carrier, origin: params.destination, destination: params.origin,
          date: params.returnDate, depHour: 18, durH, stops: v.stops,
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
  const link = bookingSearchLink({
    city: params.city,
    checkIn: params.checkIn,
    checkOut: params.checkOut,
    adults: params.adults,
    stars: params.stars,
  });

  const tiers = [
    { mult: 0.85, rating: 7.9, label: "Value", cancel: "Check cancellation terms when booking" },
    { mult: 1.0, rating: 8.5, label: "Central", cancel: "Free cancellation available on most rooms" },
    { mult: 1.3, rating: 9.1, label: "Premium", cancel: "Check cancellation terms when booking" },
  ];

  return tiers.map((t) => {
    const nightly = round5(baseUsd * t.mult * rate);
    return {
      name: `${params.stars}★ ${t.label} stay · ${params.city}`,
      location: `${params.city} (central)`,
      address: "",
      stars: params.stars,
      nightlyRate: nightly,
      totalCost: nightly * nights,
      amenities: ["WiFi", "Breakfast"],
      rating: t.rating,
      cancellationPolicy: t.cancel,
      bookingLink: link,
    };
  });
}
