export interface Airline {
  code: string;
  name: string;
  alliance?: string;
  program: string; // loyalty / rewards programme name
}

// Major carriers with their frequent-flyer programmes.
export const AIRLINES: Airline[] = [
  { code: "BA", name: "British Airways", alliance: "Oneworld", program: "Executive Club (Avios)" },
  { code: "VS", name: "Virgin Atlantic", alliance: "SkyTeam", program: "Flying Club" },
  { code: "AA", name: "American Airlines", alliance: "Oneworld", program: "AAdvantage" },
  { code: "UA", name: "United Airlines", alliance: "Star Alliance", program: "MileagePlus" },
  { code: "DL", name: "Delta Air Lines", alliance: "SkyTeam", program: "SkyMiles" },
  { code: "AC", name: "Air Canada", alliance: "Star Alliance", program: "Aeroplan" },
  { code: "LH", name: "Lufthansa", alliance: "Star Alliance", program: "Miles & More" },
  { code: "AF", name: "Air France", alliance: "SkyTeam", program: "Flying Blue" },
  { code: "KL", name: "KLM", alliance: "SkyTeam", program: "Flying Blue" },
  { code: "LX", name: "SWISS", alliance: "Star Alliance", program: "Miles & More" },
  { code: "IB", name: "Iberia", alliance: "Oneworld", program: "Iberia Plus (Avios)" },
  { code: "AZ", name: "ITA Airways", alliance: "SkyTeam", program: "Volare" },
  { code: "TK", name: "Turkish Airlines", alliance: "Star Alliance", program: "Miles&Smiles" },
  { code: "EK", name: "Emirates", program: "Skywards" },
  { code: "EY", name: "Etihad Airways", program: "Etihad Guest" },
  { code: "QR", name: "Qatar Airways", alliance: "Oneworld", program: "Privilege Club (Avios)" },
  { code: "SQ", name: "Singapore Airlines", alliance: "Star Alliance", program: "KrisFlyer" },
  { code: "CX", name: "Cathay Pacific", alliance: "Oneworld", program: "Cathay (Asia Miles)" },
  { code: "QF", name: "Qantas", alliance: "Oneworld", program: "Frequent Flyer" },
  { code: "NZ", name: "Air New Zealand", alliance: "Star Alliance", program: "Airpoints" },
  { code: "NH", name: "ANA", alliance: "Star Alliance", program: "ANA Mileage Club" },
  { code: "JL", name: "Japan Airlines", alliance: "Oneworld", program: "JAL Mileage Bank" },
  { code: "KE", name: "Korean Air", alliance: "SkyTeam", program: "SKYPASS" },
  { code: "CZ", name: "China Southern", program: "Sky Pearl Club" },
  { code: "CA", name: "Air China", alliance: "Star Alliance", program: "PhoenixMiles" },
  { code: "TG", name: "Thai Airways", alliance: "Star Alliance", program: "Royal Orchid Plus" },
  { code: "MH", name: "Malaysia Airlines", alliance: "Oneworld", program: "Enrich" },
  { code: "AI", name: "Air India", alliance: "Star Alliance", program: "Flying Returns" },
  { code: "SA", name: "South African Airways", alliance: "Star Alliance", program: "Voyager" },
  { code: "ET", name: "Ethiopian Airlines", alliance: "Star Alliance", program: "ShebaMiles" },
  { code: "LA", name: "LATAM Airlines", program: "LATAM Pass" },
  { code: "B6", name: "JetBlue", program: "TrueBlue" },
  { code: "WN", name: "Southwest Airlines", program: "Rapid Rewards" },
  { code: "AS", name: "Alaska Airlines", alliance: "Oneworld", program: "Mileage Plan" },
];

// National / flag carrier by country (only countries whose carrier is in AIRLINES).
const COUNTRY_CARRIERS: Record<string, string> = {
  "United Kingdom": "BA",
  "United States": "AA",
  Canada: "AC",
  France: "AF",
  Germany: "LH",
  Netherlands: "KL",
  Spain: "IB",
  Italy: "AZ",
  Switzerland: "LX",
  Turkey: "TK",
  "United Arab Emirates": "EK",
  Qatar: "QR",
  Japan: "NH",
  "South Korea": "KE",
  China: "CA",
  "Hong Kong": "CX",
  Singapore: "SQ",
  Thailand: "TG",
  Malaysia: "MH",
  India: "AI",
  Australia: "QF",
  "New Zealand": "NZ",
  "South Africa": "SA",
  Ethiopia: "ET",
  Brazil: "LA",
  Chile: "LA",
};

export function nationalCarrier(country: string | undefined): Airline | undefined {
  if (!country) return undefined;
  const code = COUNTRY_CARRIERS[country];
  return code ? AIRLINES.find((a) => a.code === code) : undefined;
}

/**
 * Surfaces national carriers (departure first, destination second if different)
 * at the top, with all remaining airlines sorted alphabetically below.
 */
export function suggestAirlines(
  departureCountry?: string,
  destinationCountry?: string
): { suggested: Airline[]; rest: Airline[] } {
  const suggested: Airline[] = [];
  const dep = nationalCarrier(departureCountry);
  const dest = nationalCarrier(destinationCountry);
  if (dep) suggested.push(dep);
  if (dest && dest.code !== dep?.code) suggested.push(dest);

  const suggestedCodes = new Set(suggested.map((a) => a.code));
  const rest = AIRLINES.filter((a) => !suggestedCodes.has(a.code)).sort((x, y) =>
    x.name.localeCompare(y.name)
  );
  return { suggested, rest };
}

export function searchAirlines(query: string, limit = 8): Airline[] {
  const q = query.trim().toLowerCase();
  if (!q) return AIRLINES.slice(0, limit);
  return AIRLINES.filter(
    (a) =>
      a.name.toLowerCase().includes(q) ||
      a.code.toLowerCase() === q ||
      a.program.toLowerCase().includes(q) ||
      (a.alliance ?? "").toLowerCase().includes(q)
  ).slice(0, limit);
}

export function findAirline(name: string): Airline | undefined {
  const n = name.trim().toLowerCase();
  return AIRLINES.find((a) => a.name.toLowerCase() === n || a.code.toLowerCase() === n);
}
