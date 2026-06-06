"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { FlightDetail, HotelDetail } from "@/lib/types";

interface BookingData {
  id: string;
  reference: string;
  createdAt: string;
  status: string;
  trip: {
    fullName: string;
    email: string;
    phone: string;
    originCity: string;
    destinations: string[];
    departureDate: string;
    returnDate: string;
    numberOfNights: number;
    totalBudget: number;
    currency: string;
    numberOfTravellers: number;
    cabinClass: string;
    tripPurpose: string;
  };
  plan: {
    label: string;
    justification: string;
    flights: FlightDetail[];
    hotel: HotelDetail;
    flightCost: number;
    hotelCost: number;
    totalCost: number;
  };
}

export default function BookingPage({ params }: { params: Promise<{ bookingId: string }> }) {
  const { bookingId } = use(params);
  const router = useRouter();
  const [booking, setBooking] = useState<BookingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/bookings/${bookingId}`)
      .then((r) => r.json())
      .then((data) => {
        if (data.error) throw new Error(data.error);
        setBooking(data);
      })
      .catch((err) => setError(err.message ?? "Failed to load booking"))
      .finally(() => setLoading(false));
  }, [bookingId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfaf5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#0a1628] border-t-[#c9a84c] animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading your booking…</p>
        </div>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-screen bg-[#fdfaf5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error || "Booking not found"}</p>
          <button onClick={() => router.push("/")} className="text-[#0a1628] underline">← Start over</button>
        </div>
      </div>
    );
  }

  const outbound = booking.plan.flights.find((f) => !f.isReturn);
  const returnFlight = booking.plan.flights.find((f) => f.isReturn);

  return (
    <div className="min-h-screen bg-[#fdfaf5]">
      {/* Header */}
      <header className="bg-[#0a1628] px-6 py-5">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-[#c9a84c] text-xs tracking-[4px] uppercase block mb-0.5">Executive Travel Planner</span>
            <h1 className="text-white text-xl font-light">Booking Confirmed</h1>
          </div>
          <button onClick={() => router.push("/")} className="text-slate-400 hover:text-white text-sm transition-colors">
            Plan another trip →
          </button>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 py-10">
        {/* Success banner */}
        <div className="bg-emerald-50 border border-emerald-200 rounded-2xl p-6 mb-8 text-center fade-in-up">
          <div className="w-16 h-16 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-emerald-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold text-[#0a1628] mb-2">Your trip is confirmed</h2>
          <p className="text-slate-600 mb-4">A confirmation has been sent to <strong>{booking.trip.email}</strong></p>
          <div className="inline-block bg-[#0a1628] text-[#c9a84c] px-6 py-3 rounded-xl">
            <span className="text-xs tracking-[4px] uppercase block mb-1">Booking Reference</span>
            <span className="text-2xl font-bold tracking-[6px]">{booking.reference}</span>
          </div>
        </div>

        {/* Details grid */}
        <div className="grid md:grid-cols-2 gap-6 mb-8">
          {/* Trip overview */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-[#0a1628] font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <span>🌍</span> Trip Overview
            </h3>
            <div className="space-y-3 text-sm">
              <Row label="Traveller" value={booking.trip.fullName} />
              <Row label="Contact" value={booking.trip.email} />
              <Row label="Phone" value={booking.trip.phone} />
              <Row label="Route" value={`${booking.trip.originCity} → ${booking.trip.destinations.join(" → ")}`} />
              <Row label="Dates" value={`${booking.trip.departureDate} → ${booking.trip.returnDate}`} />
              <Row label="Duration" value={`${booking.trip.numberOfNights} nights`} />
              <Row label="Passengers" value={`${booking.trip.numberOfTravellers} × ${booking.trip.cabinClass}`} />
              <Row label="Purpose" value={booking.trip.tripPurpose} />
            </div>
          </div>

          {/* Selected plan */}
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h3 className="text-[#0a1628] font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
              <span>✈️</span> Selected Plan
            </h3>
            <p className="font-bold text-[#0a1628] text-lg mb-1">{booking.plan.label}</p>
            <p className="text-slate-500 text-sm italic mb-5">{booking.plan.justification}</p>

            <div className="bg-[#0a1628] rounded-xl p-4 text-sm">
              <div className="flex justify-between text-slate-400 mb-2">
                <span>Flights</span>
                <span className="text-white">{booking.trip.currency} {booking.plan.flightCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between text-slate-400 mb-3">
                <span>Hotel ({booking.trip.numberOfNights}n)</span>
                <span className="text-white">{booking.trip.currency} {booking.plan.hotelCost.toLocaleString()}</span>
              </div>
              <div className="flex justify-between border-t border-slate-700 pt-3">
                <span className="text-white font-semibold">Total</span>
                <span className="text-[#c9a84c] font-bold text-lg">{booking.trip.currency} {booking.plan.totalCost.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Flight details */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-6">
          <h3 className="text-[#0a1628] font-semibold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
            <span>✈️</span> Flight Details
          </h3>
          <div className="space-y-4">
            {[outbound, returnFlight].filter(Boolean).map((flight, i) => (
              <FlightCard key={i} flight={flight!} currency={booking.trip.currency} />
            ))}
          </div>
        </div>

        {/* Hotel details */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 mb-8">
          <h3 className="text-[#0a1628] font-semibold text-sm uppercase tracking-wider mb-5 flex items-center gap-2">
            <span>🏨</span> Hotel Details
          </h3>
          <div className="flex items-start justify-between mb-4">
            <div>
              <p className="font-bold text-[#0a1628] text-xl">{booking.plan.hotel.name}</p>
              {booking.plan.hotel.brand && <p className="text-sm text-slate-400">{booking.plan.hotel.brand}</p>}
              <p className="text-slate-600 mt-1">{booking.plan.hotel.location}</p>
              {booking.plan.hotel.address && <p className="text-sm text-slate-400">{booking.plan.hotel.address}</p>}
            </div>
            <div className="text-right">
              <span className="text-yellow-500">{"★".repeat(booking.plan.hotel.stars)}</span>
              <p className="text-sm text-slate-500 mt-1">{booking.trip.currency} {booking.plan.hotel.nightlyRate.toLocaleString()}/night</p>
            </div>
          </div>

          <div className="grid sm:grid-cols-3 gap-4 text-sm mb-4">
            <InfoBox label="Check-in" value={booking.plan.hotel.checkIn} />
            <InfoBox label="Check-out" value={booking.plan.hotel.checkOut} />
            {booking.plan.hotel.loyaltyProgram && <InfoBox label="Loyalty" value={booking.plan.hotel.loyaltyProgram} />}
          </div>

          <p className="text-sm text-emerald-600 mb-4">{booking.plan.hotel.cancellationPolicy}</p>

          {booking.plan.hotel.amenities.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {booking.plan.hotel.amenities.map((a) => (
                <span key={a} className="bg-slate-100 text-slate-600 px-3 py-1 rounded-full text-xs">{a}</span>
              ))}
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="text-center">
          <p className="text-slate-500 text-sm mb-6">
            Keep your reference number <strong className="text-[#0a1628]">{booking.reference}</strong> for your records.
          </p>
          <button
            onClick={() => router.push("/")}
            className="bg-[#0a1628] text-white px-10 py-4 rounded-xl font-semibold hover:bg-[#122040] transition-colors"
          >
            Plan another trip
          </button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-slate-500 shrink-0">{label}</span>
      <span className="text-[#0a1628] font-medium text-right">{value}</span>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="bg-[#fdfaf5] rounded-lg p-3">
      <p className="text-xs text-slate-400 uppercase tracking-wider mb-1">{label}</p>
      <p className="text-[#0a1628] font-semibold text-sm">{value}</p>
    </div>
  );
}

function FlightCard({ flight, currency }: { flight: FlightDetail; currency: string }) {
  return (
    <div className="bg-[#fdfaf5] rounded-xl p-4 border border-slate-100">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 bg-slate-200 px-2 py-0.5 rounded-full">
          {flight.isReturn ? "Return" : "Outbound"}
        </span>
        <span className="text-sm font-bold text-[#0a1628]">{currency} {flight.price.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2 mb-2">
        <span className="font-bold text-[#0a1628]">{flight.airline}</span>
        <span className="text-slate-400 text-sm">{flight.flightNumber}</span>
      </div>
      <div className="flex items-center gap-3">
        <div className="text-center">
          <p className="text-xl font-bold text-[#0a1628]">{flight.departure.airport}</p>
          <p className="text-sm text-slate-500">{flight.departure.time}</p>
          <p className="text-xs text-slate-400">{flight.departure.date}</p>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-slate-400">{flight.duration}</span>
          <div className="w-full flex items-center gap-1">
            <div className="flex-1 border-t border-dashed border-slate-300" />
            <span className="text-slate-400 text-xs">✈</span>
            <div className="flex-1 border-t border-dashed border-slate-300" />
          </div>
          {flight.layovers.length > 0 ? (
            <span className="text-xs text-amber-600">{flight.layovers.length} stop · {flight.layovers.map(l => l.airport).join(", ")}</span>
          ) : (
            <span className="text-xs text-emerald-600">Direct</span>
          )}
        </div>
        <div className="text-center">
          <p className="text-xl font-bold text-[#0a1628]">{flight.arrival.airport}</p>
          <p className="text-sm text-slate-500">{flight.arrival.time}</p>
          <p className="text-xs text-slate-400">{flight.arrival.date}</p>
        </div>
      </div>
    </div>
  );
}
