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
  // Context
  tripPurpose: string;
  specialRequirements?: string;
  loyaltyNumbers?: string;
  // Auth
  pin?: string;
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
}

export interface BookingDetails {
  id: string;
  reference: string;
  createdAt: string;
  status: string;
  trip: TripFormData & { id: string };
  plan: TravelPlan & { id: string };
}
