"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { use } from "react";
import { TravelPlan } from "@/lib/types";

interface TripData {
  id: string;
  fullName: string;
  originCity: string;
  destinations: string[];
  departureDate: string;
  returnDate: string;
  numberOfNights: number;
  currency: string;
  totalBudget: number;
  numberOfTravellers: number;
  cabinClass: string;
}

interface PlanWithId extends TravelPlan {
  id: string;
}

const PLAN_ICONS = ["💰", "⚡", "👑", "🔄", "✈️"];
const PLAN_COLORS = [
  "border-emerald-200 hover:border-emerald-400",
  "border-blue-200 hover:border-blue-400",
  "border-purple-200 hover:border-purple-400",
  "border-amber-200 hover:border-amber-400",
  "border-sky-200 hover:border-sky-400",
];
const PLAN_BADGE_COLORS = [
  "bg-emerald-100 text-emerald-800",
  "bg-blue-100 text-blue-800",
  "bg-purple-100 text-purple-800",
  "bg-amber-100 text-amber-800",
  "bg-sky-100 text-sky-800",
];

export default function PlansPage({ params }: { params: Promise<{ tripId: string }> }) {
  const { tripId } = use(params);
  const router = useRouter();
  const [trip, setTrip] = useState<TripData | null>(null);
  const [plans, setPlans] = useState<PlanWithId[]>([]);
  const [selected, setSelected] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [booking, setBooking] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    fetch(`/api/trips?tripId=${tripId}`)
      .then((r) => r.json())
      .then((data) => {
        setTrip(data.trip);
        setPlans(data.plans);
      })
      .catch(() => setError("Failed to load itineraries"))
      .finally(() => setLoading(false));
  }, [tripId]);

  async function handleBook() {
    if (!selected) return;
    setBooking(true);
    setError("");
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tripId, planId: selected }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Booking failed");
      router.push(`/booking/${data.bookingId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Booking failed");
      setBooking(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fdfaf5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 rounded-full border-4 border-[#0a1628] border-t-[#c9a84c] animate-spin mx-auto mb-4" />
          <p className="text-slate-500">Loading your itineraries…</p>
        </div>
      </div>
    );
  }

  if (error && !plans.length) {
    return (
      <div className="min-h-screen bg-[#fdfaf5] flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <button onClick={() => router.push("/")} className="text-[#0a1628] underline">← Start over</button>
        </div>
      </div>
    );
  }

  const selectedPlan = plans.find((p) => p.id === selected);

  return (
    <div className="min-h-screen bg-[#fdfaf5]">
      {/* Header */}
      <header className="bg-[#0a1628] px-6 py-5 sticky top-0 z-40 shadow-lg">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div>
            <span className="text-[#c9a84c] text-xs tracking-[4px] uppercase block mb-0.5">Executive Travel Planner</span>
            <h1 className="text-white text-xl font-light">Your Itinerary Options</h1>
          </div>
          <button onClick={() => router.push("/")} className="text-slate-400 hover:text-white text-sm transition-colors">
            ← Modify requirements
          </button>
        </div>
      </header>

      {/* Trip summary bar */}
      {trip && (
        <div className="bg-white border-b border-slate-100 px-6 py-4">
          <div className="max-w-7xl mx-auto flex flex-wrap items-center gap-4 text-sm text-slate-600">
            <span className="font-semibold text-[#0a1628]">{trip.fullName}</span>
            <span className="text-slate-300">|</span>
            <span>{trip.originCity} → {trip.destinations.join(" → ")}</span>
            <span className="text-slate-300">|</span>
            <span>{trip.departureDate} – {trip.returnDate}</span>
            <span className="text-slate-300">|</span>
            <span>{trip.numberOfTravellers} pax · {trip.cabinClass}</span>
            <span className="text-slate-300">|</span>
            <span className="font-medium text-[#c9a84c]">Budget: {trip.currency} {trip.totalBudget.toLocaleString()}</span>
          </div>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 py-10">
        <div className="text-center mb-10">
          <p className="text-[#c9a84c] text-xs tracking-[4px] uppercase mb-2">5 Options</p>
          <h2 className="text-[#0a1628] text-3xl font-light mb-3">Select your preferred itinerary</h2>
          <p className="text-slate-500">Each option has been tailored to different priorities. Select one to proceed.</p>
        </div>

        {/* Plans grid */}
        <div className="grid lg:grid-cols-5 md:grid-cols-3 sm:grid-cols-2 grid-cols-1 gap-4 mb-8">
          {plans.map((plan, i) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              index={i}
              currency={trip?.currency ?? "GBP"}
              isSelected={selected === plan.id}
              onSelect={() => setSelected(plan.id)}
              colorCls={PLAN_COLORS[i]}
              badgeCls={PLAN_BADGE_COLORS[i]}
              icon={PLAN_ICONS[i]}
            />
          ))}
        </div>

        {/* Selected plan detail */}
        {selectedPlan && (
          <div className="bg-white rounded-2xl border border-[#c9a84c] shadow-lg p-6 mb-8 fade-in-up">
            <div className="flex items-center justify-between mb-6">
              <div>
                <span className="text-[#c9a84c] text-xs tracking-widest uppercase">Selected Plan</span>
                <h3 className="text-[#0a1628] text-xl font-semibold mt-1">{selectedPlan.label}</h3>
              </div>
              <div className="text-right">
                <span className="text-xs text-slate-500 uppercase tracking-wider block">Total</span>
                <span className="text-2xl font-bold text-[#0a1628]">{trip?.currency} {selectedPlan.totalCost.toLocaleString()}</span>
              </div>
            </div>

            <p className="text-slate-600 mb-6 italic">{selectedPlan.justification}</p>

            <div className="grid md:grid-cols-2 gap-6">
              {/* Flights */}
              <div>
                <h4 className="text-[#0a1628] font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                  ✈️ Flights
                  <span className="ml-auto text-[#c9a84c] font-bold">{trip?.currency} {selectedPlan.flightCost.toLocaleString()}</span>
                </h4>
                <div className="space-y-3">
                  {selectedPlan.flights.map((flight, fi) => (
                    <div key={fi} className="bg-[#fdfaf5] rounded-xl p-4 border border-slate-100">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs text-slate-400 uppercase tracking-wider">{flight.isReturn ? "Return" : "Outbound"}</span>
                        <span className="text-xs font-semibold text-[#0a1628]">{trip?.currency} {flight.price.toLocaleString()}</span>
                      </div>
                      <p className="font-semibold text-[#0a1628]">{flight.airline} {flight.flightNumber}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-sm font-bold">{flight.departure.airport}</span>
                        <span className="text-xs text-slate-400">{flight.departure.time}</span>
                        <span className="flex-1 border-t border-dashed border-slate-300 mx-1" />
                        <span className="text-xs text-slate-500">{flight.duration}</span>
                        <span className="flex-1 border-t border-dashed border-slate-300 mx-1" />
                        <span className="text-xs text-slate-400">{flight.arrival.time}</span>
                        <span className="text-sm font-bold">{flight.arrival.airport}</span>
                      </div>
                      {flight.layovers.length > 0 && (
                        <p className="text-xs text-slate-400 mt-1">via {flight.layovers.map((l) => `${l.airport} (${l.duration})`).join(", ")}</p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Hotel */}
              <div>
                <h4 className="text-[#0a1628] font-semibold text-sm uppercase tracking-wider mb-4 flex items-center gap-2">
                  🏨 Hotel
                  <span className="ml-auto text-[#c9a84c] font-bold">{trip?.currency} {selectedPlan.hotelCost.toLocaleString()}</span>
                </h4>
                <div className="bg-[#fdfaf5] rounded-xl p-4 border border-slate-100">
                  <div className="flex items-start justify-between mb-2">
                    <div>
                      <p className="font-semibold text-[#0a1628]">{selectedPlan.hotel.name}</p>
                      {selectedPlan.hotel.brand && <p className="text-xs text-slate-400">{selectedPlan.hotel.brand}</p>}
                    </div>
                    <span className="text-yellow-500 text-sm">{"★".repeat(selectedPlan.hotel.stars)}</span>
                  </div>
                  <p className="text-sm text-slate-600 mb-3">{selectedPlan.hotel.location}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-500 mb-3">
                    <div><span className="font-semibold text-[#0a1628]">Check-in:</span> {selectedPlan.hotel.checkIn}</div>
                    <div><span className="font-semibold text-[#0a1628]">Check-out:</span> {selectedPlan.hotel.checkOut}</div>
                    <div><span className="font-semibold text-[#0a1628]">Per night:</span> {trip?.currency} {selectedPlan.hotel.nightlyRate.toLocaleString()}</div>
                    {selectedPlan.hotel.loyaltyProgram && (
                      <div><span className="font-semibold text-[#0a1628]">Loyalty:</span> {selectedPlan.hotel.loyaltyProgram}</div>
                    )}
                  </div>
                  <p className="text-xs text-emerald-600">{selectedPlan.hotel.cancellationPolicy}</p>
                  {selectedPlan.hotel.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {selectedPlan.hotel.amenities.map((a) => (
                        <span key={a} className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Cost breakdown */}
            <div className="mt-6 bg-[#0a1628] rounded-xl p-4 flex items-center justify-between flex-wrap gap-4">
              <div className="flex gap-8 text-sm">
                <div className="text-slate-400">
                  <span className="block text-xs uppercase tracking-wider mb-1">Flights</span>
                  <span className="text-white font-semibold">{trip?.currency} {selectedPlan.flightCost.toLocaleString()}</span>
                </div>
                <div className="text-slate-400">
                  <span className="block text-xs uppercase tracking-wider mb-1">Hotel ({trip?.numberOfNights}n)</span>
                  <span className="text-white font-semibold">{trip?.currency} {selectedPlan.hotelCost.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-xs text-slate-400 uppercase tracking-wider mb-1">Total</span>
                <span className="text-[#c9a84c] font-bold text-2xl">{trip?.currency} {selectedPlan.totalCost.toLocaleString()}</span>
              </div>
            </div>
          </div>
        )}

        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm mb-4">
            {error}
          </div>
        )}

        {/* CTA */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
          <button onClick={() => router.push("/")} className="text-slate-600 hover:text-[#0a1628] text-sm transition-colors">
            ← Modify requirements
          </button>
          <button
            onClick={handleBook}
            disabled={!selected || booking}
            className={`px-10 py-4 rounded-xl font-semibold text-base transition-all ${selected && !booking ? "bg-[#c9a84c] text-[#0a1628] hover:bg-[#d4b96a] shadow-lg shadow-[#c9a84c]/30" : "bg-slate-200 text-slate-400 cursor-not-allowed"}`}
          >
            {booking ? "Confirming booking…" : selected ? `Book "${selectedPlan?.label}" →` : "Select an itinerary to book"}
          </button>
        </div>
      </div>
    </div>
  );
}

function PlanCard({ plan, index, currency, isSelected, onSelect, colorCls, badgeCls, icon }: {
  plan: PlanWithId;
  index: number;
  currency: string;
  isSelected: boolean;
  onSelect: () => void;
  colorCls: string;
  badgeCls: string;
  icon: string;
}) {
  const outbound = plan.flights.find((f: { isReturn?: boolean }) => !f.isReturn);
  const returnFlight = plan.flights.find((f: { isReturn?: boolean }) => f.isReturn);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={`w-full text-left bg-white rounded-2xl border-2 p-4 transition-all duration-200 hover:shadow-lg ${colorCls} ${isSelected ? "plan-card-selected shadow-xl" : "shadow-sm"}`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className="text-2xl">{icon}</span>
        {isSelected && <span className="text-[#c9a84c] text-xs font-bold uppercase tracking-widest">✓ Selected</span>}
      </div>

      <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold mb-2 ${badgeCls}`}>
        Option {index + 1}
      </span>

      <h3 className="font-bold text-[#0a1628] text-sm mb-2">{plan.label}</h3>

      {outbound && (
        <div className="text-xs text-slate-500 mb-1">
          <span className="font-medium text-slate-700">{outbound.airline}</span> · {outbound.departure.airport}→{outbound.arrival.airport}
          {outbound.layovers.length === 0 ? " · Direct" : ` · ${outbound.layovers.length} stop`}
        </div>
      )}
      {returnFlight && (
        <div className="text-xs text-slate-500 mb-3">
          <span className="font-medium text-slate-700">{returnFlight.airline}</span> · {returnFlight.departure.airport}→{returnFlight.arrival.airport}
          {returnFlight.layovers.length === 0 ? " · Direct" : ` · ${returnFlight.layovers.length} stop`}
        </div>
      )}

      <div className="bg-slate-50 rounded-lg p-2 text-xs text-slate-500 mb-3">
        <p className="font-medium text-slate-700">{plan.hotel.name}</p>
        <p>{"★".repeat(plan.hotel.stars)} · {plan.hotel.location}</p>
      </div>

      <div className="border-t border-slate-100 pt-3 mt-auto">
        <div className="flex justify-between text-xs text-slate-500 mb-1">
          <span>Flights</span><span>{currency} {plan.flightCost.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-xs text-slate-500 mb-2">
          <span>Hotel</span><span>{currency} {plan.hotelCost.toLocaleString()}</span>
        </div>
        <div className="flex justify-between font-bold text-[#0a1628]">
          <span>Total</span><span>{currency} {plan.totalCost.toLocaleString()}</span>
        </div>
      </div>
    </button>
  );
}
