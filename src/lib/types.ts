export interface TripFormData {
  // Traveller
  fullName: string;
  email: string;
  phone: string;
  // Route
  originCity: string;
  destinations: string[];
  departureDate: string;
  returnDate: string;
  numberOfNights: number;
  // Budget
  totalBudget: number;
  currency: string;
  // Travel class
  numberOfTravellers: number;
  cabinClass: "economy" | "business" | "first";
  // Accommodation
  hotelStarRating: number;
  locationPreference: "city_centre" | "airport" | "flexible";
  amenities: string[];
  // Airline preference
  preferredAirline?: string;
  airlineRewards?: string;
  // Context
  tripPurpose: string;
  specialRequirements?: string;
  loyaltyNumbers?: string;
}

export interface PreferredAirline {
  airline: string;
  rewardsNumber: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  image: string | null;
  phone: string;
  defaultAirports: string[];
  preferredAirlines: PreferredAirline[];
  defaultCabinClass: "" | "economy" | "business" | "first";
  defaultHotelStars: number | null;
  defaultLocationPreference: "" | "city_centre" | "airport" | "flexible";
  standingRequirements: string;
}

export interface FlightDetail {
  airline: string;
  flightNumber: string;
  departure: { airport: string; time: string; date: string };
  arrival: { airport: string; time: string; date: string };
  layovers: { airport: string; duration: string }[];
  duration: string;
  price: number;
  isReturn?: boolean;
}

export interface HotelDetail {
  name: string;
  brand?: string;
  location: string;
  address: string;
  stars: number;
  nightlyRate: number;
  totalCost: number;
  amenities: string[];
  loyaltyProgram?: string;
  cancellationPolicy: string;
  checkIn: string;
  checkOut: string;
}

export interface TravelPlan {
  planIndex: number;
  label: string;
  justification: string;
  flights: FlightDetail[];
  hotel: HotelDetail;
  flightCost: number;
  hotelCost: number;
  totalCost: number;
  pricesFetchedAt?: string; // ISO timestamp of when live prices were researched
  sources?: string[]; // booking platforms referenced
}

export interface BookingDetails {
  id: string;
  reference: string;
  createdAt: string;
  status: string;
  trip: TripFormData & { id: string };
  plan: TravelPlan & { id: string };
}
