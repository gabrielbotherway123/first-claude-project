"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui";
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
  preferredAirline?: string | null;
}

interface PlanWithId extends TravelPlan {
  id: string;
}

const PLAN_ICONS = ["◇", "⚡", "♛", "↻", "★"];

function stripCode(s: string) {
  return s.replace(/\s*\(.*\)/, "");
}

function fetchedLabel(iso?: string) {
  if (!iso) return null;
  const then = new Date(iso).getTime();
  const mins = Math.max(0, Math.round((Date.now() - then) / 60000));
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return new Date(iso).toLocaleDateString();
}

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
        if (data.error) throw new Error(data.error);
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="w-12 h-12 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] mb-4"
        />
        <p className="text-[var(--text-muted)]">Loading your itineraries…</p>
      </div>
    );
  }

  if (error && !plans.length) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--danger)]">{error}</p>
        <Button variant="outline" onClick={() => router.push("/")}>← Start over</Button>
      </div>
    );
  }

  const selectedPlan = plans.find((p) => p.id === selected);
  const cur = trip?.currency ?? "GBP";

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      {trip && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass rounded-2xl px-5 py-4 mb-8 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm"
        >
          <span className="font-semibold">
            {stripCode(trip.originCity)} → {trip.destinations.map(stripCode).join(" → ")}
          </span>
          <span className="text-[var(--text-dim)]">·</span>
          <span className="text-[var(--text-muted)]">{trip.departureDate} – {trip.returnDate}</span>
          <span className="text-[var(--text-dim)]">·</span>
          <span className="text-[var(--text-muted)]">{trip.numberOfTravellers} pax · {trip.cabinClass}</span>
          <span className="ml-auto text-[var(--accent)] font-medium">
            Budget {cur} {trip.totalBudget.toLocaleString()}
          </span>
        </motion.div>
      )}

      <div className="text-center mb-8">
        <p className="text-xs tracking-[0.3em] uppercase text-[var(--accent)] mb-2">Five options</p>
        <h1 className="text-3xl font-semibold tracking-tight">Choose your itinerary</h1>
      </div>

      <div className="grid lg:grid-cols-5 sm:grid-cols-2 gap-4 mb-8">
        {plans.map((plan, i) => {
          const outbound = plan.flights.find((f) => !f.isReturn);
          const isSel = selected === plan.id;
          const overBudget = trip ? plan.totalCost > trip.totalBudget : false;
          return (
            <motion.button
              key={plan.id}
              type="button"
              onClick={() => setSelected(plan.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              className={`glass-strong rounded-2xl p-4 text-left transition-all ${
                isSel ? "ring-2 ring-[var(--accent)]" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="text-xl accent-text">{PLAN_ICONS[i]}</span>
                {isSel && <span className="text-[var(--accent)] text-xs font-bold">✓</span>}
              </div>
              <h3 className="font-semibold text-sm mb-2 leading-tight">{plan.label}</h3>
              {outbound && (
                <p className="text-xs text-[var(--text-dim)] mb-3">
                  {outbound.airline} · {stripCode(outbound.departure.airport)}→{stripCode(outbound.arrival.airport)}
                  {outbound.layovers.length === 0 ? " · Direct" : ` · ${outbound.layovers.length} stop`}
                </p>
              )}
              <p className="text-xs text-[var(--text-dim)] mb-3 truncate">
                {"★".repeat(plan.hotel.stars)} {plan.hotel.name}
              </p>
              <div className="pt-3 border-t border-[var(--border)]">
                <p className="text-lg font-bold">
                  {cur} {plan.totalCost.toLocaleString()}
                </p>
                <p className={`text-xs ${overBudget ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                  {overBudget ? "Over budget" : "Within budget"}
                </p>
              </div>
            </motion.button>
          );
        })}
      </div>

      <AnimatePresence mode="wait">
        {selectedPlan && (
          <motion.div
            key={selectedPlan.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.25 }}
            className="glass-strong rounded-2xl p-6 mb-8"
          >
            <div className="flex items-start justify-between mb-5 gap-4">
              <div>
                <p className="text-xs uppercase tracking-wider text-[var(--accent)]">Selected</p>
                <h2 className="text-xl font-semibold mt-1">{selectedPlan.label}</h2>
              </div>
              <div className="text-right">
                <p className="text-xs text-[var(--text-dim)] uppercase">Total</p>
                <p className="text-2xl font-bold">{cur} {selectedPlan.totalCost.toLocaleString()}</p>
              </div>
            </div>
            <p className="text-[var(--text-muted)] italic mb-3">{selectedPlan.justification}</p>
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mb-6 text-xs text-[var(--text-dim)]">
              {selectedPlan.pricesFetchedAt && (
                <span className="inline-flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)]" />
                  Live prices · fetched {fetchedLabel(selectedPlan.pricesFetchedAt)}
                </span>
              )}
              {selectedPlan.sources && selectedPlan.sources.length > 0 && (
                <span>via {selectedPlan.sources.join(", ")}</span>
              )}
            </div>

            <div className="grid md:grid-cols-2 gap-5">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Flights</h3>
                  <span className="text-sm font-semibold">{cur} {selectedPlan.flightCost.toLocaleString()}</span>
                </div>
                <div className="space-y-3">
                  {selectedPlan.flights.map((f, fi) => (
                    <div key={fi} className="glass rounded-xl p-3">
                      <div className="flex justify-between items-center mb-1">
                        <span className="text-xs text-[var(--text-dim)] uppercase">{f.isReturn ? "Return" : "Outbound"}</span>
                        <span className="text-xs font-semibold">{cur} {f.price.toLocaleString()}</span>
                      </div>
                      <p className="font-medium text-sm">{f.airline} {f.flightNumber}</p>
                      <div className="flex items-center gap-2 mt-1.5 text-sm">
                        <span className="font-bold">{stripCode(f.departure.airport)}</span>
                        <span className="text-xs text-[var(--text-dim)]">{f.departure.time}</span>
                        <span className="flex-1 border-t border-dashed border-[var(--border-strong)]" />
                        <span className="text-xs text-[var(--text-dim)]">{f.duration}</span>
                        <span className="flex-1 border-t border-dashed border-[var(--border-strong)]" />
                        <span className="text-xs text-[var(--text-dim)]">{f.arrival.time}</span>
                        <span className="font-bold">{stripCode(f.arrival.airport)}</span>
                      </div>
                      {f.layovers.length > 0 && (
                        <p className="text-xs text-[var(--text-dim)] mt-1">
                          via {f.layovers.map((l) => `${l.airport} (${l.duration})`).join(", ")}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Hotel</h3>
                  <span className="text-sm font-semibold">{cur} {selectedPlan.hotelCost.toLocaleString()}</span>
                </div>
                <div className="glass rounded-xl p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{selectedPlan.hotel.name}</p>
                      {selectedPlan.hotel.brand && (
                        <p className="text-xs text-[var(--text-dim)]">{selectedPlan.hotel.brand}</p>
                      )}
                    </div>
                    <span className="text-[var(--accent)] text-sm">{"★".repeat(selectedPlan.hotel.stars)}</span>
                  </div>
                  <p className="text-sm text-[var(--text-muted)] mt-1 mb-3">{selectedPlan.hotel.location}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs text-[var(--text-muted)] mb-3">
                    <div><span className="text-[var(--text-dim)]">Check-in</span> {selectedPlan.hotel.checkIn}</div>
                    <div><span className="text-[var(--text-dim)]">Check-out</span> {selectedPlan.hotel.checkOut}</div>
                    <div><span className="text-[var(--text-dim)]">Per night</span> {cur} {selectedPlan.hotel.nightlyRate.toLocaleString()}</div>
                    {selectedPlan.hotel.loyaltyProgram && (
                      <div><span className="text-[var(--text-dim)]">Loyalty</span> {selectedPlan.hotel.loyaltyProgram}</div>
                    )}
                  </div>
                  <p className="text-xs text-[var(--success)]">{selectedPlan.hotel.cancellationPolicy}</p>
                  {selectedPlan.hotel.amenities.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-3">
                      {selectedPlan.hotel.amenities.map((a) => (
                        <span key={a} className="px-2 py-0.5 rounded-full text-xs glass text-[var(--text-muted)]">{a}</span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {error && (
        <div className="rounded-xl bg-[var(--danger)]/10 border border-[var(--danger)]/30 px-4 py-3 text-sm text-[var(--danger)] mb-4">
          {error}
        </div>
      )}

      <div className="flex items-center justify-between gap-4">
        <button onClick={() => router.push("/")} className="text-sm text-[var(--text-muted)] hover:text-[var(--text)]">
          ← Modify requirements
        </button>
        <Button onClick={handleBook} loading={booking} disabled={!selected}>
          {selected ? `Book ${selectedPlan?.label} →` : "Select an itinerary"}
        </Button>
      </div>

      <p className="text-center text-xs text-[var(--text-dim)] mt-5">
        Prices are live estimates and may change at checkout.
      </p>
    </div>
  );
}
