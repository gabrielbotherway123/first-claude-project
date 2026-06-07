import Anthropic from "@anthropic-ai/sdk";
import { TripFormData, TravelPlan } from "./types";

// Instantiate lazily so a missing key fails with a clear message at call time
// rather than throwing an opaque SDK error when the module is first imported.
let client: Anthropic | null = null;
function getClient(): Anthropic {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    throw new Error(
      "Itinerary generation is not configured yet. Add ANTHROPIC_API_KEY to your .env file."
    );
  }
  if (!client) client = new Anthropic({ apiKey });
  return client;
}

const PLAN_LABELS = [
  "Best Value",
  "Fastest Route",
  "Ultimate Luxury",
  "Flexible & Cancellable",
  "Loyalty Rewards",
];

export async function generateTravelPlans(trip: TripFormData): Promise<TravelPlan[]> {
  const prompt = buildPrompt(trip);
  const fetchedAt = new Date().toISOString();

  // Server-side web search + fetch so the model pulls real, current listings.
  const tools = [
    { type: "web_search_20260209" as const, name: "web_search" as const },
    { type: "web_fetch_20260209" as const, name: "web_fetch" as const },
  ];

  const messages: Anthropic.MessageParam[] = [{ role: "user", content: prompt }];

  let finalText = "";
  // The server runs its own tool loop; if it pauses (pause_turn) we resend to resume.
  for (let i = 0; i < 6; i++) {
    const stream = getClient().messages.stream({
      model: "claude-sonnet-4-6",
      max_tokens: 16000,
      thinking: { type: "adaptive" },
      tools,
      system: `You are an expert travel concierge with live web access. Research real, current
flight, hotel, and ground-transport listings using the web_search and web_fetch tools before
building any itinerary. Cite genuine prices and providers. When finished researching, output
ONLY the final JSON array described by the user — no prose, no markdown fences, nothing after it.`,
      messages,
    });

    const message = await stream.finalMessage();
    messages.push({ role: "assistant", content: message.content });

    if (message.stop_reason === "pause_turn") {
      continue; // resume the server tool loop
    }

    finalText = message.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n");
    break;
  }

  const parsed = extractJsonArray(finalText);
  if (!parsed) throw new Error("Failed to parse itinerary data from the research results.");

  return parsed.slice(0, 5).map((plan, i) => ({
    ...plan,
    planIndex: i,
    label: plan.label ?? PLAN_LABELS[i],
    pricesFetchedAt: fetchedAt,
    sources: Array.isArray(plan.sources) ? plan.sources : [],
  }));
}

// Pulls the first top-level JSON array out of arbitrary model text.
function extractJsonArray(text: string): TravelPlan[] | null {
  const start = text.indexOf("[");
  const end = text.lastIndexOf("]");
  if (start === -1 || end === -1 || end < start) return null;
  const slice = text.slice(start, end + 1);
  try {
    const parsed = JSON.parse(slice);
    return Array.isArray(parsed) ? parsed : null;
  } catch {
    return null;
  }
}

function buildPrompt(trip: TripFormData): string {
  const destinations = trip.destinations.join(", ");
  const amenitiesList = trip.amenities.join(", ");

  return `Research and generate exactly 5 distinct travel plan options for this executive trip,
using live web data. Return a JSON array of 5 plan objects.

TRIP DETAILS:
- Traveller: ${trip.fullName}
- From: ${trip.originCity}
- To: ${destinations}
- Departure: ${trip.departureDate}
- Return: ${trip.returnDate}
- Nights: ${trip.numberOfNights}
- Travellers: ${trip.numberOfTravellers}
- Class: ${trip.cabinClass}
- Total budget: ${trip.currency} ${trip.totalBudget}
- Purpose: ${trip.tripPurpose}
- Preferred airline: ${trip.preferredAirline || "no preference"}
- Airline rewards number: ${trip.airlineRewards || "none"}
- Hotel: ${trip.hotelStarRating} stars, ${trip.locationPreference.replace("_", " ")}
- Amenities: ${amenitiesList || "standard"}
- Loyalty numbers: ${trip.loyaltyNumbers || "none"}
- Special requirements: ${trip.specialRequirements || "none"}

RESEARCH INSTRUCTIONS — use web_search / web_fetch to find REAL, CURRENT listings:
- Flights: check Google Flights, Skyscanner, and the airline's own website (e.g. the preferred
  airline's site). Use actual routes, airlines, flight numbers, times, and fares you find.
- Accommodation: check Booking.com, Hotels.com, and the hotel's direct website for real hotels
  near the destination with current nightly rates.
- Ground transport: note approximate airport→hotel transfer cost (Uber / local taxi).
- For each plan, record the booking platforms/sources you used in a "sources" string array.
- Prices must reflect what you actually find at research time, in ${trip.currency}.

PLAN REQUIREMENTS:
- Plan 0: "Best Value" - cheapest sensible flight + hotel combination
- Plan 1: "Fastest Route" - fastest journey, minimal layovers, convenient hotel
- Plan 2: "Ultimate Luxury" - best business/first class, 5-star hotel
- Plan 3: "Flexible & Cancellable" - fully refundable flights and hotel
- Plan 4: "Loyalty Rewards" - maximise loyalty points/miles, preferred airline partners
${trip.preferredAirline ? `\nThe traveller prefers ${trip.preferredAirline}. Favour this carrier (or alliance partners) for the Fastest, Luxury and Loyalty plans${trip.airlineRewards ? `, applying rewards number ${trip.airlineRewards}` : ""}.` : ""}

Return ONLY this exact JSON array (no markdown, no explanation):
[
  {
    "planIndex": 0,
    "label": "Best Value",
    "justification": "2-3 sentence explanation citing the sources/prices found",
    "flights": [
      {
        "airline": "Airline Name",
        "flightNumber": "XX123",
        "departure": { "airport": "LHR", "time": "08:00", "date": "${trip.departureDate}" },
        "arrival": { "airport": "JFK", "time": "11:30", "date": "${trip.departureDate}" },
        "layovers": [],
        "duration": "7h 30m",
        "price": 450,
        "isReturn": false
      },
      {
        "airline": "Airline Name",
        "flightNumber": "XX456",
        "departure": { "airport": "JFK", "time": "14:00", "date": "${trip.returnDate}" },
        "arrival": { "airport": "LHR", "time": "02:00", "date": "${trip.returnDate}" },
        "layovers": [],
        "duration": "7h 00m",
        "price": 420,
        "isReturn": true
      }
    ],
    "hotel": {
      "name": "Hotel Name",
      "brand": "Brand Name",
      "location": "Area, City",
      "address": "Street Address",
      "stars": 4,
      "nightlyRate": 180,
      "totalCost": 900,
      "amenities": ["WiFi", "Gym"],
      "loyaltyProgram": "Program Name",
      "cancellationPolicy": "Free cancellation until 24h before check-in",
      "checkIn": "${trip.departureDate}",
      "checkOut": "${trip.returnDate}"
    },
    "flightCost": 870,
    "hotelCost": 900,
    "totalCost": 1770,
    "sources": ["Google Flights", "Booking.com"]
  }
]

Generate all 5 plans now, meaningfully different from each other, with realistic prices in ${trip.currency} grounded in your research for ${destinations}.`;
}
