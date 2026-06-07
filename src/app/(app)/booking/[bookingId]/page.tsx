"use client";

import { use, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "motion/react";
import { Button } from "@/components/ui";
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

function stripCode(s: string) {
  return s.replace(/\s*\(.*\)/, "");
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
      <div className="min-h-[70vh] flex flex-col items-center justify-center">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 2, ease: "linear" }}
          className="w-12 h-12 rounded-full border-2 border-[var(--border)] border-t-[var(--accent)] mb-4"
        />
        <p className="text-[var(--text-muted)]">Loading your booking…</p>
      </div>
    );
  }

  if (error || !booking) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--danger)]">{error || "Booking not found"}</p>
        <Button variant="outline" onClick={() => router.push("/")}>← Start over</Button>
      </div>
    );
  }

  const cur = booking.trip.currency;
  const outbound = booking.plan.flights.find((f) => !f.isReturn);
  const returnFlight = booking.plan.flights.find((f) => f.isReturn);

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      {/* Success */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="glass-strong rounded-2xl p-8 text-center mb-6"
      >
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{ delay: 0.15, type: "spring", stiffness: 260, damping: 18 }}
          className="w-16 h-16 rounded-full accent-gradient mx-auto mb-5 flex items-center justify-center"
        >
          <svg className="w-8 h-8 text-[var(--accent-contrast)]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
          </svg>
        </motion.div>
        <h1 className="text-2xl font-semibold mb-2">Your trip is confirmed</h1>
        <p className="text-[var(--text-muted)] mb-5">
          A confirmation has been sent to <strong className="text-[var(--text)]">{booking.trip.email}</strong>
        </p>
        <div className="inline-block glass rounded-xl px-6 py-3">
          <p className="text-xs tracking-[0.3em] uppercase text-[var(--accent)] mb-1">Reference</p>
          <p className="text-2xl font-bold font-mono tracking-[0.2em]">{booking.reference}</p>
        </div>
      </motion.div>

      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="glass-strong rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-3">Trip</h2>
          <div className="space-y-2 text-sm">
            <Row label="Traveller" value={booking.trip.fullName} />
            <Row label="Route" value={`${stripCode(booking.trip.originCity)} → ${booking.trip.destinations.map(stripCode).join(" → ")}`} />
            <Row label="Dates" value={`${booking.trip.departureDate} → ${booking.trip.returnDate}`} />
            <Row label="Nights" value={`${booking.trip.numberOfNights}`} />
            <Row label="Party" value={`${booking.trip.numberOfTravellers} × ${booking.trip.cabinClass}`} />
            <Row label="Purpose" value={booking.trip.tripPurpose} />
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-3">Plan</h2>
          <p className="font-semibold text-lg">{booking.plan.label}</p>
          <p className="text-sm text-[var(--text-muted)] italic mb-4">{booking.plan.justification}</p>
          <div className="glass rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Flights</span><span className="text-[var(--text)]">{cur} {booking.plan.flightCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Hotel ({booking.trip.numberOfNights}n)</span><span className="text-[var(--text)]">{cur} {booking.plan.hotelCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between pt-2 border-t border-[var(--border)]">
              <span className="font-semibold">Total</span>
              <span className="font-bold text-[var(--accent)]">{cur} {booking.plan.totalCost.toLocaleString()}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Flights */}
      <div className="glass-strong rounded-2xl p-5 mb-4">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-4">Flights</h2>
        <div className="space-y-3">
          {[outbound, returnFlight].filter(Boolean).map((f, i) => (
            <FlightCard key={i} flight={f!} cur={cur} />
          ))}
        </div>
      </div>

      {/* Hotel */}
      <div className="glass-strong rounded-2xl p-5 mb-8">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-4">Hotel</h2>
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-lg">{booking.plan.hotel.name}</p>
            {booking.plan.hotel.brand && <p className="text-sm text-[var(--text-dim)]">{booking.plan.hotel.brand}</p>}
            <p className="text-[var(--text-muted)] mt-1">{booking.plan.hotel.location}</p>
          </div>
          <span className="text-[var(--accent)]">{"★".repeat(booking.plan.hotel.stars)}</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-sm">
          <InfoBox label="Check-in" value={booking.plan.hotel.checkIn} />
          <InfoBox label="Check-out" value={booking.plan.hotel.checkOut} />
          <InfoBox label="Per night" value={`${cur} ${booking.plan.hotel.nightlyRate.toLocaleString()}`} />
        </div>
        {booking.plan.hotel.amenities.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-4">
            {booking.plan.hotel.amenities.map((a) => (
              <span key={a} className="px-2.5 py-1 rounded-full text-xs glass text-[var(--text-muted)]">{a}</span>
            ))}
          </div>
        )}
      </div>

      <div className="text-center">
        <p className="text-sm text-[var(--text-muted)] mb-5">
          Keep reference <strong className="text-[var(--text)] font-mono">{booking.reference}</strong> for your records.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Button variant="outline" onClick={() => router.push("/trips")}>My trips</Button>
          <Button onClick={() => router.push("/")}>Plan another trip</Button>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-4">
      <span className="text-[var(--text-dim)] shrink-0">{label}</span>
      <span className="text-right">{value}</span>
    </div>
  );
}

function InfoBox({ label, value }: { label: string; value: string }) {
  return (
    <div className="glass rounded-lg p-3">
      <p className="text-xs text-[var(--text-dim)] uppercase tracking-wider mb-1">{label}</p>
      <p className="font-semibold text-sm">{value}</p>
    </div>
  );
}

function FlightCard({ flight, cur }: { flight: FlightDetail; cur: string }) {
  return (
    <div className="glass rounded-xl p-4">
      <div className="flex items-center justify-between mb-3">
        <span className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)] glass px-2 py-0.5 rounded-full">
          {flight.isReturn ? "Return" : "Outbound"}
        </span>
        <span className="text-sm font-bold">{cur} {flight.price.toLocaleString()}</span>
      </div>
      <p className="font-medium mb-2">
        {flight.airline} <span className="text-[var(--text-dim)]">{flight.flightNumber}</span>
      </p>
      <div className="flex items-center gap-3">
        <div className="text-center">
          <p className="text-xl font-bold">{stripCode(flight.departure.airport)}</p>
          <p className="text-sm text-[var(--text-muted)]">{flight.departure.time}</p>
          <p className="text-xs text-[var(--text-dim)]">{flight.departure.date}</p>
        </div>
        <div className="flex-1 flex flex-col items-center gap-1">
          <span className="text-xs text-[var(--text-dim)]">{flight.duration}</span>
          <div className="w-full flex items-center gap-1">
            <div className="flex-1 border-t border-dashed border-[var(--border-strong)]" />
            <span className="text-[var(--accent)] text-xs">✈</span>
            <div className="flex-1 border-t border-dashed border-[var(--border-strong)]" />
          </div>
          {flight.layovers.length > 0 ? (
            <span className="text-xs text-[var(--accent)]">
              {flight.layovers.length} stop · {flight.layovers.map((l) => stripCode(l.airport)).join(", ")}
            </span>
          ) : (
            <span className="text-xs text-[var(--success)]">Direct</span>
          )}
        </div>
        <div className="text-center">
          <p className="text-xl font-bold">{stripCode(flight.arrival.airport)}</p>
          <p className="text-sm text-[var(--text-muted)]">{flight.arrival.time}</p>
          <p className="text-xs text-[var(--text-dim)]">{flight.arrival.date}</p>
        </div>
      </div>
    </div>
  );
}
