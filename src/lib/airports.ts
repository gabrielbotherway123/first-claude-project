export interface Airport {
  iata: string;
  name: string;
  city: string;
  country: string;
}

// Curated dataset of major international airports. Includes multi-airport
// cities (London, New York, Paris, Tokyo, etc.) so disambiguation works.
export const AIRPORTS: Airport[] = [
  // United Kingdom & Ireland
  { iata: "LHR", name: "Heathrow", city: "London", country: "United Kingdom" },
  { iata: "LGW", name: "Gatwick", city: "London", country: "United Kingdom" },
  { iata: "LCY", name: "City", city: "London", country: "United Kingdom" },
  { iata: "STN", name: "Stansted", city: "London", country: "United Kingdom" },
  { iata: "LTN", name: "Luton", city: "London", country: "United Kingdom" },
  { iata: "MAN", name: "Manchester", city: "Manchester", country: "United Kingdom" },
  { iata: "EDI", name: "Edinburgh", city: "Edinburgh", country: "United Kingdom" },
  { iata: "BHX", name: "Birmingham", city: "Birmingham", country: "United Kingdom" },
  { iata: "GLA", name: "Glasgow", city: "Glasgow", country: "United Kingdom" },
  { iata: "BRS", name: "Bristol", city: "Bristol", country: "United Kingdom" },
  { iata: "DUB", name: "Dublin", city: "Dublin", country: "Ireland" },
  // United States
  { iata: "JFK", name: "John F. Kennedy Intl", city: "New York", country: "United States" },
  { iata: "LGA", name: "LaGuardia", city: "New York", country: "United States" },
  { iata: "EWR", name: "Newark Liberty Intl", city: "New York", country: "United States" },
  { iata: "LAX", name: "Los Angeles Intl", city: "Los Angeles", country: "United States" },
  { iata: "SFO", name: "San Francisco Intl", city: "San Francisco", country: "United States" },
  { iata: "ORD", name: "O'Hare Intl", city: "Chicago", country: "United States" },
  { iata: "MDW", name: "Midway Intl", city: "Chicago", country: "United States" },
  { iata: "MIA", name: "Miami Intl", city: "Miami", country: "United States" },
  { iata: "BOS", name: "Logan Intl", city: "Boston", country: "United States" },
  { iata: "SEA", name: "Seattle-Tacoma Intl", city: "Seattle", country: "United States" },
  { iata: "ATL", name: "Hartsfield-Jackson Intl", city: "Atlanta", country: "United States" },
  { iata: "DFW", name: "Dallas/Fort Worth Intl", city: "Dallas", country: "United States" },
  { iata: "DEN", name: "Denver Intl", city: "Denver", country: "United States" },
  { iata: "IAD", name: "Washington Dulles Intl", city: "Washington", country: "United States" },
  { iata: "DCA", name: "Reagan National", city: "Washington", country: "United States" },
  { iata: "IAH", name: "George Bush Intercontinental", city: "Houston", country: "United States" },
  { iata: "LAS", name: "Harry Reid Intl", city: "Las Vegas", country: "United States" },
  { iata: "PHX", name: "Sky Harbor Intl", city: "Phoenix", country: "United States" },
  { iata: "WAS", name: "All Airports", city: "Washington", country: "United States" },
  // Canada
  { iata: "YYZ", name: "Pearson Intl", city: "Toronto", country: "Canada" },
  { iata: "YVR", name: "Vancouver Intl", city: "Vancouver", country: "Canada" },
  { iata: "YUL", name: "Montréal-Trudeau Intl", city: "Montreal", country: "Canada" },
  // Western Europe
  { iata: "CDG", name: "Charles de Gaulle", city: "Paris", country: "France" },
  { iata: "ORY", name: "Orly", city: "Paris", country: "France" },
  { iata: "NCE", name: "Côte d'Azur", city: "Nice", country: "France" },
  { iata: "FRA", name: "Frankfurt Airport", city: "Frankfurt", country: "Germany" },
  { iata: "MUC", name: "Munich Airport", city: "Munich", country: "Germany" },
  { iata: "BER", name: "Brandenburg", city: "Berlin", country: "Germany" },
  { iata: "DUS", name: "Düsseldorf", city: "Düsseldorf", country: "Germany" },
  { iata: "HAM", name: "Hamburg", city: "Hamburg", country: "Germany" },
  { iata: "AMS", name: "Schiphol", city: "Amsterdam", country: "Netherlands" },
  { iata: "BRU", name: "Brussels Airport", city: "Brussels", country: "Belgium" },
  { iata: "MAD", name: "Adolfo Suárez Barajas", city: "Madrid", country: "Spain" },
  { iata: "BCN", name: "El Prat", city: "Barcelona", country: "Spain" },
  { iata: "LIS", name: "Humberto Delgado", city: "Lisbon", country: "Portugal" },
  { iata: "FCO", name: "Fiumicino", city: "Rome", country: "Italy" },
  { iata: "MXP", name: "Malpensa", city: "Milan", country: "Italy" },
  { iata: "LIN", name: "Linate", city: "Milan", country: "Italy" },
  { iata: "VCE", name: "Marco Polo", city: "Venice", country: "Italy" },
  { iata: "ZRH", name: "Zürich Airport", city: "Zurich", country: "Switzerland" },
  { iata: "GVA", name: "Geneva Airport", city: "Geneva", country: "Switzerland" },
  { iata: "VIE", name: "Vienna Intl", city: "Vienna", country: "Austria" },
  { iata: "CPH", name: "Copenhagen Airport", city: "Copenhagen", country: "Denmark" },
  { iata: "ARN", name: "Arlanda", city: "Stockholm", country: "Sweden" },
  { iata: "OSL", name: "Gardermoen", city: "Oslo", country: "Norway" },
  { iata: "HEL", name: "Helsinki-Vantaa", city: "Helsinki", country: "Finland" },
  { iata: "ATH", name: "Eleftherios Venizelos", city: "Athens", country: "Greece" },
  // Eastern Europe & Middle East
  { iata: "IST", name: "Istanbul Airport", city: "Istanbul", country: "Turkey" },
  { iata: "SVO", name: "Sheremetyevo", city: "Moscow", country: "Russia" },
  { iata: "WAW", name: "Chopin", city: "Warsaw", country: "Poland" },
  { iata: "PRG", name: "Václav Havel", city: "Prague", country: "Czechia" },
  { iata: "DXB", name: "Dubai Intl", city: "Dubai", country: "United Arab Emirates" },
  { iata: "AUH", name: "Zayed Intl", city: "Abu Dhabi", country: "United Arab Emirates" },
  { iata: "DOH", name: "Hamad Intl", city: "Doha", country: "Qatar" },
  { iata: "RUH", name: "King Khalid Intl", city: "Riyadh", country: "Saudi Arabia" },
  { iata: "JED", name: "King Abdulaziz Intl", city: "Jeddah", country: "Saudi Arabia" },
  { iata: "TLV", name: "Ben Gurion", city: "Tel Aviv", country: "Israel" },
  { iata: "CAI", name: "Cairo Intl", city: "Cairo", country: "Egypt" },
  // Asia
  { iata: "HND", name: "Haneda", city: "Tokyo", country: "Japan" },
  { iata: "NRT", name: "Narita Intl", city: "Tokyo", country: "Japan" },
  { iata: "KIX", name: "Kansai Intl", city: "Osaka", country: "Japan" },
  { iata: "ICN", name: "Incheon Intl", city: "Seoul", country: "South Korea" },
  { iata: "PEK", name: "Capital Intl", city: "Beijing", country: "China" },
  { iata: "PKX", name: "Daxing Intl", city: "Beijing", country: "China" },
  { iata: "PVG", name: "Pudong Intl", city: "Shanghai", country: "China" },
  { iata: "SHA", name: "Hongqiao Intl", city: "Shanghai", country: "China" },
  { iata: "CAN", name: "Baiyun Intl", city: "Guangzhou", country: "China" },
  { iata: "HKG", name: "Hong Kong Intl", city: "Hong Kong", country: "Hong Kong" },
  { iata: "TPE", name: "Taoyuan Intl", city: "Taipei", country: "Taiwan" },
  { iata: "SIN", name: "Changi", city: "Singapore", country: "Singapore" },
  { iata: "BKK", name: "Suvarnabhumi", city: "Bangkok", country: "Thailand" },
  { iata: "KUL", name: "Kuala Lumpur Intl", city: "Kuala Lumpur", country: "Malaysia" },
  { iata: "CGK", name: "Soekarno-Hatta Intl", city: "Jakarta", country: "Indonesia" },
  { iata: "MNL", name: "Ninoy Aquino Intl", city: "Manila", country: "Philippines" },
  { iata: "DEL", name: "Indira Gandhi Intl", city: "Delhi", country: "India" },
  { iata: "BOM", name: "Chhatrapati Shivaji Intl", city: "Mumbai", country: "India" },
  { iata: "BLR", name: "Kempegowda Intl", city: "Bangalore", country: "India" },
  // Oceania
  { iata: "SYD", name: "Kingsford Smith", city: "Sydney", country: "Australia" },
  { iata: "MEL", name: "Tullamarine", city: "Melbourne", country: "Australia" },
  { iata: "BNE", name: "Brisbane Airport", city: "Brisbane", country: "Australia" },
  { iata: "PER", name: "Perth Airport", city: "Perth", country: "Australia" },
  { iata: "AKL", name: "Auckland Airport", city: "Auckland", country: "New Zealand" },
  { iata: "WLG", name: "Wellington Airport", city: "Wellington", country: "New Zealand" },
  { iata: "CHC", name: "Christchurch Airport", city: "Christchurch", country: "New Zealand" },
  // Africa & South America
  { iata: "JNB", name: "O. R. Tambo Intl", city: "Johannesburg", country: "South Africa" },
  { iata: "CPT", name: "Cape Town Intl", city: "Cape Town", country: "South Africa" },
  { iata: "NBO", name: "Jomo Kenyatta Intl", city: "Nairobi", country: "Kenya" },
  { iata: "LOS", name: "Murtala Muhammed Intl", city: "Lagos", country: "Nigeria" },
  { iata: "GRU", name: "Guarulhos Intl", city: "São Paulo", country: "Brazil" },
  { iata: "GIG", name: "Galeão Intl", city: "Rio de Janeiro", country: "Brazil" },
  { iata: "EZE", name: "Ministro Pistarini", city: "Buenos Aires", country: "Argentina" },
  { iata: "SCL", name: "Arturo Merino Benítez", city: "Santiago", country: "Chile" },
  { iata: "BOG", name: "El Dorado Intl", city: "Bogotá", country: "Colombia" },
  { iata: "MEX", name: "Benito Juárez Intl", city: "Mexico City", country: "Mexico" },
  { iata: "CUN", name: "Cancún Intl", city: "Cancún", country: "Mexico" },
];

export function searchAirports(query: string, limit = 8): Airport[] {
  const q = query.trim().toLowerCase();
  if (!q) return [];

  const scored = AIRPORTS.map((a) => {
    const iata = a.iata.toLowerCase();
    const city = a.city.toLowerCase();
    const name = a.name.toLowerCase();
    const country = a.country.toLowerCase();
    let score = -1;

    if (iata === q) score = 100;
    else if (city === q) score = 90;
    else if (iata.startsWith(q)) score = 80;
    else if (city.startsWith(q)) score = 70;
    else if (name.startsWith(q)) score = 60;
    else if (city.includes(q)) score = 50;
    else if (name.includes(q)) score = 40;
    else if (country.includes(q)) score = 20;

    return { a, score };
  })
    .filter((s) => s.score >= 0)
    .sort((x, y) => y.score - x.score || x.a.city.localeCompare(y.a.city));

  return scored.slice(0, limit).map((s) => s.a);
}

export function formatAirport(a: Airport): string {
  return `${a.city} ${a.name} (${a.iata})`;
}

const BY_IATA = new Map(AIRPORTS.map((a) => [a.iata, a]));

/** Extracts the IATA code from a formatted string like "Paris Charles de Gaulle (CDG)". */
export function extractIata(formatted: string): string | null {
  const m = formatted.match(/\(([A-Z]{3})\)\s*$/);
  return m ? m[1] : null;
}

/** Resolves the country for a formatted airport string, if known. */
export function countryFor(formatted: string): string | undefined {
  const iata = extractIata(formatted);
  if (!iata) return undefined;
  return BY_IATA.get(iata)?.country;
}

/** Resolves the city for a formatted airport string, falling back to the label. */
export function cityFor(formatted: string): string {
  const iata = extractIata(formatted);
  const known = iata ? BY_IATA.get(iata) : undefined;
  if (known) return known.city;
  return formatted.replace(/\s*\(.*\)\s*$/, "").trim();
}

// City-centre coordinates for every city in AIRPORTS — Duffel Stays' search
// endpoint takes geographic coordinates, not city names, so this is the
// bridge between the two. Approximate (city centre, not per-airport) is
// plenty precise for a hotel-search radius of a few kilometres.
const CITY_COORDS: Record<string, { lat: number; lng: number }> = {
  London: { lat: 51.5072, lng: -0.1276 },
  Manchester: { lat: 53.4808, lng: -2.2426 },
  Edinburgh: { lat: 55.9533, lng: -3.1883 },
  Birmingham: { lat: 52.4862, lng: -1.8904 },
  Glasgow: { lat: 55.8642, lng: -4.2518 },
  Bristol: { lat: 51.4545, lng: -2.5879 },
  Dublin: { lat: 53.3498, lng: -6.2603 },
  "New York": { lat: 40.7128, lng: -74.006 },
  "Los Angeles": { lat: 34.0522, lng: -118.2437 },
  "San Francisco": { lat: 37.7749, lng: -122.4194 },
  Chicago: { lat: 41.8781, lng: -87.6298 },
  Miami: { lat: 25.7617, lng: -80.1918 },
  Boston: { lat: 42.3601, lng: -71.0589 },
  Seattle: { lat: 47.6062, lng: -122.3321 },
  Atlanta: { lat: 33.749, lng: -84.388 },
  Dallas: { lat: 32.7767, lng: -96.797 },
  Denver: { lat: 39.7392, lng: -104.9903 },
  Washington: { lat: 38.9072, lng: -77.0369 },
  Houston: { lat: 29.7604, lng: -95.3698 },
  "Las Vegas": { lat: 36.1699, lng: -115.1398 },
  Phoenix: { lat: 33.4484, lng: -112.074 },
  Toronto: { lat: 43.6532, lng: -79.3832 },
  Vancouver: { lat: 49.2827, lng: -123.1207 },
  Montreal: { lat: 45.5019, lng: -73.5674 },
  Paris: { lat: 48.8566, lng: 2.3522 },
  Nice: { lat: 43.7102, lng: 7.262 },
  Frankfurt: { lat: 50.1109, lng: 8.6821 },
  Munich: { lat: 48.1351, lng: 11.582 },
  Berlin: { lat: 52.52, lng: 13.405 },
  "Düsseldorf": { lat: 51.2277, lng: 6.7735 },
  Hamburg: { lat: 53.5511, lng: 9.9937 },
  Amsterdam: { lat: 52.3676, lng: 4.9041 },
  Brussels: { lat: 50.8503, lng: 4.3517 },
  Madrid: { lat: 40.4168, lng: -3.7038 },
  Barcelona: { lat: 41.3851, lng: 2.1734 },
  Lisbon: { lat: 38.7223, lng: -9.1393 },
  Rome: { lat: 41.9028, lng: 12.4964 },
  Milan: { lat: 45.4642, lng: 9.19 },
  Venice: { lat: 45.4408, lng: 12.3155 },
  Zurich: { lat: 47.3769, lng: 8.5417 },
  Geneva: { lat: 46.2044, lng: 6.1432 },
  Vienna: { lat: 48.2082, lng: 16.3738 },
  Copenhagen: { lat: 55.6761, lng: 12.5683 },
  Stockholm: { lat: 59.3293, lng: 18.0686 },
  Oslo: { lat: 59.9139, lng: 10.7522 },
  Helsinki: { lat: 60.1699, lng: 24.9384 },
  Athens: { lat: 37.9838, lng: 23.7275 },
  Istanbul: { lat: 41.0082, lng: 28.9784 },
  Moscow: { lat: 55.7558, lng: 37.6173 },
  Warsaw: { lat: 52.2297, lng: 21.0122 },
  Prague: { lat: 50.0755, lng: 14.4378 },
  Dubai: { lat: 25.2048, lng: 55.2708 },
  "Abu Dhabi": { lat: 24.4539, lng: 54.3773 },
  Doha: { lat: 25.2854, lng: 51.531 },
  Riyadh: { lat: 24.7136, lng: 46.6753 },
  Jeddah: { lat: 21.4858, lng: 39.1925 },
  "Tel Aviv": { lat: 32.0853, lng: 34.7818 },
  Cairo: { lat: 30.0444, lng: 31.2357 },
  Tokyo: { lat: 35.6762, lng: 139.6503 },
  Osaka: { lat: 34.6937, lng: 135.5023 },
  Seoul: { lat: 37.5665, lng: 126.978 },
  Beijing: { lat: 39.9042, lng: 116.4074 },
  Shanghai: { lat: 31.2304, lng: 121.4737 },
  Guangzhou: { lat: 23.1291, lng: 113.2644 },
  "Hong Kong": { lat: 22.3193, lng: 114.1694 },
  Taipei: { lat: 25.033, lng: 121.5654 },
  Singapore: { lat: 1.3521, lng: 103.8198 },
  Bangkok: { lat: 13.7563, lng: 100.5018 },
  "Kuala Lumpur": { lat: 3.139, lng: 101.6869 },
  Jakarta: { lat: -6.2088, lng: 106.8456 },
  Manila: { lat: 14.5995, lng: 120.9842 },
  Delhi: { lat: 28.7041, lng: 77.1025 },
  Mumbai: { lat: 19.076, lng: 72.8777 },
  Bangalore: { lat: 12.9716, lng: 77.5946 },
  Sydney: { lat: -33.8688, lng: 151.2093 },
  Melbourne: { lat: -37.8136, lng: 144.9631 },
  Brisbane: { lat: -27.4698, lng: 153.0251 },
  Perth: { lat: -31.9505, lng: 115.8605 },
  Auckland: { lat: -36.8509, lng: 174.7645 },
  Wellington: { lat: -41.2865, lng: 174.7762 },
  Christchurch: { lat: -43.532, lng: 172.6306 },
  Johannesburg: { lat: -26.2041, lng: 28.0473 },
  "Cape Town": { lat: -33.9249, lng: 18.4241 },
  Nairobi: { lat: -1.2921, lng: 36.8219 },
  Lagos: { lat: 6.5244, lng: 3.3792 },
  "São Paulo": { lat: -23.5505, lng: -46.6333 },
  "Rio de Janeiro": { lat: -22.9068, lng: -43.1729 },
  "Buenos Aires": { lat: -34.6037, lng: -58.3816 },
  Santiago: { lat: -33.4489, lng: -70.6693 },
  "Bogotá": { lat: 4.711, lng: -74.0721 },
  "Mexico City": { lat: 19.4326, lng: -99.1332 },
  "Cancún": { lat: 21.1619, lng: -86.8515 },
};

/** Geographic coordinates for a formatted airport string's city, when known. */
export function coordsForCity(formatted: string): { lat: number; lng: number } | undefined {
  return CITY_COORDS[cityFor(formatted)];
}
