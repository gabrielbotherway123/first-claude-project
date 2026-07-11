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
  // Budget — single optional total (0/undefined = no constraint)
  totalBudget?: number;
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
  bookingLink?: string;
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
  bookingLink?: string;
  rating?: number; // guest review score (0-10) when available
}

/** A hotel result from a search provider (Duffel Stays or the indicative estimate). */
export interface HotelOption {
  name: string;
  location: string;
  address: string;
  stars: number;
  nightlyRate: number;
  totalCost: number;
  amenities: string[];
  rating?: number; // guest score 0-10
  cancellationPolicy: string;
  bookingLink: string;
}

export interface TransferEstimate {
  provider: string; // e.g. "Uber" or "Estimate"
  product: string; // e.g. "UberX"
  amount: number;
  currency: string;
  from: string;
  to: string;
  note?: string;
  bookingLink?: string;
  live: boolean; // true if a real fare estimate, false if heuristic
}

export interface TravelPlan {
  planIndex: number;
  label: string;
  justification: string;
  flights: FlightDetail[];
  hotel: HotelDetail;
  transfer?: TransferEstimate;
  flightCost: number;
  hotelCost: number;
  transferCost: number;
  totalCost: number;
  pricesFetchedAt?: string; // ISO timestamp of when live prices were fetched
  sources?: string[]; // data providers used
  unavailable?: string[]; // components that could not be loaded live
}

export interface BookingDetails {
  id: string;
  reference: string;
  createdAt: string;
  status: string;
  trip: TripFormData & { id: string };
  plan: TravelPlan & { id: string };
}
