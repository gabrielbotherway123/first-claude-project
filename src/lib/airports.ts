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
