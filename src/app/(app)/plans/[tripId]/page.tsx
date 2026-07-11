"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { Button } from "@/components/ui";
import { TravelPlan } from "@/lib/types";

interface TripData {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  originCity: string;
  destinations: string[];
  departureDate: string;
  returnDate: string;
  numberOfNights: number;
  currency: string;
  totalBudget?: number | null;
  numberOfTravellers: number;
  numberOfChildren: number;
  cabinClass: string;
  preferredAirline?: string | null;
  airlineNote?: string | null;
}

interface FlightsConfig {
  flightsConfigured: boolean;
  flightsLiveMode: boolean;
}

interface PlanWithId extends TravelPlan {
  id: string;
}

/** Google Calendar "add event" template link for the whole trip. */
function googleCalendarUrl(trip: TripData, plan: PlanWithId): string {
  const start = trip.departureDate.replace(/-/g, "");
  // Google treats the end date as exclusive for all-day events — add a day.
  const endBase = trip.returnDate || trip.departureDate;
  const end = new Date(endBase);
  end.setDate(end.getDate() + 1);
  const endStr = end.toISOString().slice(0, 10).replace(/-/g, "");
  const dest = trip.destinations.map(stripCode).join(", ");
  const outbound = plan.flights.find((f) => !f.isReturn);
  const details =
    `Atlas itinerary — ${plan.label}\n` +
    `Route: ${stripCode(trip.originCity)} → ${dest}\n` +
    (outbound ? `Outbound: ${outbound.airline} ${outbound.flightNumber} at ${outbound.departure.time}\n` : "") +
    `Hotel: ${plan.hotel.name}\n` +
    `Estimated total: ${trip.currency} ${plan.totalCost.toLocaleString()}`;
  const qs = new URLSearchParams({
    action: "TEMPLATE",
    text: `Trip to ${dest}`,
    dates: `${start}/${endStr}`,
    details,
    location: dest,
  });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}

/** One-click flight checkout: pre-loads the route so Atlas books the fare via
 *  Duffel with no search step — the traveller just confirms and pays. */
function flightCheckoutUrl(trip: TripData): string {
  const qs = new URLSearchParams({
    origin: trip.originCity,
    destination: trip.destinations[0] ?? "",
    depart: trip.departureDate,
    adults: String(trip.numberOfTravellers),
    cabin: trip.cabinClass,
    autoSearch: "true",
  });
  if (trip.returnDate) qs.set("return", trip.returnDate);
  return `/flights?${qs.toString()}`;
}

/** Share the itinerary via the native share sheet, falling back to email. */
async function shareItinerary(trip: TripData, plan: PlanWithId) {
  const dest = trip.destinations.map(stripCode).join(", ");
  const text =
    `My Atlas trip to ${dest} (${trip.departureDate} – ${trip.returnDate}).\n` +
    `${plan.label} · estimated total ${trip.currency} ${plan.totalCost.toLocaleString()}.`;
  const nav = navigator as Navigator & { share?: (data: ShareData) => Promise<void> };
  if (typeof nav.share === "function") {
    try {
      await nav.share({ title: `Trip to ${dest}`, text });
      return;
    } catch {
      /* user cancelled or share failed — fall through to email */
    }
  }
  window.location.href = `mailto:?subject=${encodeURIComponent(`Trip to ${dest}`)}&body=${encodeURIComponent(text)}`;
}


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
  const [config, setConfig] = useState<FlightsConfig>({ flightsConfigured: false, flightsLiveMode: false });
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
        if (data.config) setConfig(data.config);
      })
      .catch(() => setError("Failed to load itineraries"))
      .finally(() => setLoading(false));
  }, [tripId]);

  function choosePlan(id: string) {
    setSelected(id);
  }

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
          {trip.totalBudget ? (
            <span className="ml-auto text-[var(--accent)] font-medium">
              Budget {cur} {trip.totalBudget.toLocaleString()}
            </span>
          ) : null}
        </motion.div>
      )}

      <div className="text-center mb-8">
        <p className="text-xs tracking-[0.3em] uppercase text-[var(--accent)] mb-2">Five options</p>
        <h1 className="text-3xl font-semibold tracking-tight">Choose your itinerary</h1>
        {trip?.airlineNote && (
          <p className="text-sm text-[var(--text-muted)] mt-3">{trip.airlineNote}</p>
        )}
      </div>

      <div className="grid lg:grid-cols-5 sm:grid-cols-2 gap-4 mb-8">
        {plans.map((plan, i) => {
          const outbound = plan.flights.find((f) => !f.isReturn);
          const isSel = selected === plan.id;
          const hasBudget = Boolean(trip?.totalBudget);
          const overBudget = trip?.totalBudget ? plan.totalCost > trip.totalBudget : false;
          return (
            <motion.button
              key={plan.id}
              type="button"
              onClick={() => choosePlan(plan.id)}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.06 }}
              whileHover={{ y: -4 }}
              className={`glass-strong rounded-2xl p-4 text-left transition-all ${
                isSel ? "ring-2 ring-[var(--accent)]" : ""
              }`}
            >
              <div className="flex items-center justify-between mb-3">
                <span className="w-6 h-6 rounded-full glass flex items-center justify-center text-xs font-bold accent-text">
                  {i + 1}
                </span>
                {isSel && <span className="text-[var(--accent)] text-xs font-bold uppercase tracking-wider">Selected</span>}
              </div>
              <h3 className="font-semibold text-sm mb-2 leading-tight">{plan.label}</h3>
              {outbound && (
                <p className="text-xs text-[var(--text-dim)] mb-3">
                  {outbound.airline} · {stripCode(outbound.departure.airport)}→{stripCode(outbound.arrival.airport)}
                  {outbound.layovers.length > 0 ? ` · ${outbound.layovers.length} stop` : ""}
                </p>
              )}
              <p className="text-xs text-[var(--text-dim)] mb-3 truncate">
                {plan.hotel.stars}-star · {plan.hotel.name}
              </p>
              <div className="pt-3 border-t border-[var(--border)]">
                <p className="text-lg font-bold">
                  {cur} {plan.totalCost.toLocaleString()}
                </p>
                {hasBudget && (
                  <p className={`text-xs ${overBudget ? "text-[var(--danger)]" : "text-[var(--success)]"}`}>
                    {overBudget ? "Over budget" : "Within budget"}
                  </p>
                )}
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
            {selectedPlan.pricesFetchedAt && (
              <div className="mb-6 text-xs text-[var(--text-dim)]">
                Prices updated {fetchedLabel(selectedPlan.pricesFetchedAt)}
              </div>
            )}

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
                        <p className="text-xs text-[var(--accent)] mt-1">
                          {f.layovers.length === 1 ? "Connects in " : "Connects via "}
                          {f.layovers.map((l) => `${stripCode(l.airport)} (${l.duration})`).join(", ")}
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
                    <div className="text-right shrink-0">
                      <span className="text-[var(--accent)] text-sm font-semibold block">{selectedPlan.hotel.stars}-star</span>
                      {selectedPlan.hotel.rating ? (
                        <span className="text-xs text-[var(--success)]">{selectedPlan.hotel.rating.toFixed(1)}/10</span>
                      ) : null}
                    </div>
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

            {/* Ground transfer */}
            {selectedPlan.transfer && (
              <div className="mt-5">
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)]">Airport transfer</h3>
                  <span className="text-sm font-semibold">{cur} {selectedPlan.transferCost.toLocaleString()}</span>
                </div>
                <div className="glass rounded-xl p-4 flex items-center justify-between gap-4">
                  <div>
                    <p className="font-medium text-sm">
                      {selectedPlan.transfer.provider} · {selectedPlan.transfer.product}
                    </p>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      {selectedPlan.transfer.from} → {selectedPlan.transfer.to}
                    </p>
                    {selectedPlan.transfer.note && (
                      <p className="text-xs text-[var(--text-dim)] mt-1">{selectedPlan.transfer.note}</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Itemised totals */}
            <div className="mt-5 glass rounded-xl p-4 flex flex-wrap items-end justify-between gap-4">
              <div className="flex gap-6 text-sm">
                <div>
                  <span className="block text-xs text-[var(--text-dim)] uppercase">Flights</span>
                  <span className="font-semibold">{cur} {selectedPlan.flightCost.toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-xs text-[var(--text-dim)] uppercase">Hotel</span>
                  <span className="font-semibold">{cur} {selectedPlan.hotelCost.toLocaleString()}</span>
                </div>
                <div>
                  <span className="block text-xs text-[var(--text-dim)] uppercase">Transfer</span>
                  <span className="font-semibold">{cur} {selectedPlan.transferCost.toLocaleString()}</span>
                </div>
              </div>
              <div className="text-right">
                <span className="block text-xs text-[var(--text-dim)] uppercase">Total</span>
                <span className="font-bold text-xl text-[var(--accent)]">{cur} {selectedPlan.totalCost.toLocaleString()}</span>
              </div>
            </div>

            {/* Book flights via Atlas (one click → Duffel checkout) + calendar / share */}
            {trip && (
              <div className="mt-5 flex flex-wrap items-center gap-3">
                {config.flightsConfigured && (
                  <Button onClick={() => router.push(flightCheckoutUrl(trip))}>
                    Book flights →
                  </Button>
                )}
                <a
                  href={googleCalendarUrl(trip, selectedPlan)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center px-4 py-2 rounded-xl text-sm border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-all"
                >
                  Add to Google Calendar
                </a>
                <button
                  type="button"
                  onClick={() => shareItinerary(trip, selectedPlan)}
                  className="inline-flex items-center px-4 py-2 rounded-xl text-sm border border-[var(--border)] text-[var(--text-muted)] hover:border-[var(--border-strong)] transition-all"
                >
                  Share with family
                </button>
              </div>
            )}

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
        <Button onClick={handleBook} loading={booking} disabled={!selected} variant="outline">
          {selected ? "Confirm itinerary & hotel →" : "Select an itinerary"}
        </Button>
      </div>

      <p className="text-center text-xs text-[var(--text-dim)] mt-5">
        Prices are estimates and may change at checkout.
      </p>
    </div>
  );
}
