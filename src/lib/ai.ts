import Anthropic from "@anthropic-ai/sdk";
import { TripFormData, TravelPlan, FlightDetail, HotelDetail } from "./types";

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const PLAN_LABELS = [
  "Best Value",
  "Fastest Route",
  "Ultimate Luxury",
  "Flexible & Cancellable",
  "Loyalty Rewards",
];

export async function generateTravelPlans(trip: TripFormData): Promise<TravelPlan[]> {
  const prompt = buildPrompt(trip);

  const response = await client.messages.create({
    model: "claude-sonnet-4-6",
    max_tokens: 8000,
    system: `You are an expert corporate travel planner with access to real-time flight and hotel data.
You create detailed, realistic travel itineraries for executives and business professionals.
Always respond with valid JSON only. No markdown, no code blocks, just raw JSON.`,
    messages: [{ role: "user", content: prompt }],
  });

  const text = response.content.find((b) => b.type === "text")?.text ?? "[]";

  let plans: TravelPlan[];
  try {
    const parsed = JSON.parse(text);
    plans = Array.isArray(parsed) ? parsed : parsed.plans ?? [];
  } catch {
    throw new Error("Failed to parse AI response as JSON");
  }

  return plans.slice(0, 5).map((plan, i) => ({
    ...plan,
    planIndex: i,
    label: plan.label ?? PLAN_LABELS[i],
  }));
}

function buildPrompt(trip: TripFormData): string {
  const destinations = trip.destinations.join(", ");
  const amenitiesList = trip.amenities.join(", ");

  return `Generate exactly 5 distinct travel plan options for this executive trip. Return a JSON array of 5 plan objects.

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
- Hotel: ${trip.hotelStarRating} stars, ${trip.locationPreference.replace("_", " ")}
- Amenities: ${amenitiesList || "standard"}
- Loyalty numbers: ${trip.loyaltyNumbers || "none"}
- Special requirements: ${trip.specialRequirements || "none"}

PLAN REQUIREMENTS:
- Plan 0: "Best Value" - prioritise cost savings, budget airline/hotel combination
- Plan 1: "Fastest Route" - fastest possible journey, minimal layovers, convenient hotel
- Plan 2: "Ultimate Luxury" - best airline business/first class, 5-star hotel, premium experience
- Plan 3: "Flexible & Cancellable" - fully refundable flights and hotel, flexible dates
- Plan 4: "Loyalty Rewards" - maximise loyalty points/miles accumulation, preferred airline partners

Each plan MUST include realistic:
- Outbound and return flights with specific airline names, flight numbers, realistic times
- Hotel recommendation with actual hotel brand and location
- Itemised costs that sum correctly to totalCost
- All costs in ${trip.currency}

Return ONLY this exact JSON array (no markdown, no explanation):
[
  {
    "planIndex": 0,
    "label": "Best Value",
    "justification": "2-3 sentence explanation of why this plan suits the traveller",
    "flights": [
      {
        "airline": "Airline Name",
        "flightNumber": "XX123",
        "departure": { "airport": "LHR", "time": "08:00", "date": "2024-03-15" },
        "arrival": { "airport": "JFK", "time": "11:30", "date": "2024-03-15" },
        "layovers": [],
        "duration": "7h 30m",
        "price": 450,
        "isReturn": false
      },
      {
        "airline": "Airline Name",
        "flightNumber": "XX456",
        "departure": { "airport": "JFK", "time": "14:00", "date": "2024-03-20" },
        "arrival": { "airport": "LHR", "time": "02:00", "date": "2024-03-21" },
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
      "checkIn": "2024-03-15",
      "checkOut": "2024-03-20"
    },
    "flightCost": 870,
    "hotelCost": 900,
    "totalCost": 1770
  }
]

Generate all 5 plans now. Make them meaningfully different from each other. Vary prices realistically based on the plan type (luxury should cost more, value should cost less). Use realistic airline and hotel names appropriate for ${destinations}.`;
}
