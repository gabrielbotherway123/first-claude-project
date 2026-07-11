import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui";
import type { FlightDetail, HotelDetail, TransferEstimate } from "@/lib/types";

export const metadata = { title: "Complete your booking · Atlas" };

function stripCode(s: string) {
  return s.replace(/\s*\(.*\)/, "");
}

export default async function BookingPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const { bookingId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: { trip: true, plan: true },
  });

  if (!booking || booking.trip.userId !== session.user.id) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--danger)]">Booking not found.</p>
        <Link href="/">
          <Button variant="outline">← Start over</Button>
        </Link>
      </div>
    );
  }

  const cur = booking.trip.currency;
  const destinations: string[] = JSON.parse(booking.trip.destinations);
  const flights: FlightDetail[] = JSON.parse(booking.plan.flights);
  const hotel: HotelDetail = JSON.parse(booking.plan.hotel);
  const transfer: TransferEstimate | null = booking.plan.transfer
    ? JSON.parse(booking.plan.transfer)
    : null;
  const outbound = flights.find((f) => !f.isReturn);
  const returnFlight = flights.find((f) => f.isReturn);

  // Internal Atlas checkout links: the flight search (Duffel, pre-filled and
  // auto-searching) and the exact hotel/room (Duffel Stays). Both book inside
  // Atlas. The hotel link is empty for indicative-only estimates.
  const hotelCheckout = hotel.bookingLink || "";
  const flightCheckout = outbound?.bookingLink || "/flights";

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 fade-in-up">
      {/* Header */}
      <div className="glass-strong rounded-2xl p-8 text-center mb-6">
        <p className="text-xs tracking-[0.3em] uppercase text-[var(--accent)] mb-3">Itinerary ready</p>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2">
          {stripCode(booking.trip.originCity)} → {destinations.map(stripCode).join(" → ")}
        </h1>
        <p className="text-[var(--text-muted)] max-w-md mx-auto">
          Book your flights and room directly in Atlas — powered by Duffel. Just enter your
          traveller details to complete each purchase.
        </p>
        <p className="text-xs text-[var(--text-dim)] mt-4">
          Atlas reference <span className="font-mono">{booking.reference}</span>
        </p>
      </div>

      {/* Primary hand-off */}
      <div className="glass-strong rounded-2xl p-6 mb-6">
        <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-4">
          Complete your booking
        </h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <Link
            href={flightCheckout}
            className="inline-flex flex-col items-center justify-center gap-1 rounded-xl px-6 py-4 accent-gradient text-[var(--accent-contrast)] shadow-lg hover:brightness-110 transition-all"
          >
            <span className="text-base font-semibold">Book flights →</span>
            <span className="text-xs opacity-80">
              {outbound?.airline} · {cur} {booking.plan.flightCost.toLocaleString()}
            </span>
          </Link>
          {hotelCheckout ? (
            <Link
              href={hotelCheckout}
              className="inline-flex flex-col items-center justify-center gap-1 rounded-xl px-6 py-4 accent-gradient text-[var(--accent-contrast)] shadow-lg hover:brightness-110 transition-all"
            >
              <span className="text-base font-semibold">Book hotel →</span>
              <span className="text-xs opacity-80">
                {hotel.name.length > 28 ? `${hotel.name.slice(0, 28)}…` : hotel.name} · {cur}{" "}
                {booking.plan.hotelCost.toLocaleString()}
              </span>
            </Link>
          ) : (
            <div className="inline-flex flex-col items-center justify-center gap-1 rounded-xl px-6 py-4 glass text-[var(--text-muted)]">
              <span className="text-base font-semibold">Hotel · indicative</span>
              <span className="text-xs opacity-80">Live stays available for supported cities</span>
            </div>
          )}
        </div>
        <p className="text-xs text-[var(--text-dim)] mt-3">
          Flights and stays are booked directly in Atlas through Duffel — no third-party
          redirects. Prices are confirmed live before you pay.
        </p>
      </div>

      {/* Summary */}
      <div className="grid sm:grid-cols-2 gap-4 mb-4">
        <div className="glass-strong rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-3">Trip</h2>
          <div className="space-y-2 text-sm">
            <Row label="Traveller" value={booking.trip.fullName} />
            <Row label="Dates" value={`${booking.trip.departureDate} → ${booking.trip.returnDate}`} />
            <Row label="Nights" value={`${booking.trip.numberOfNights}`} />
            <Row label="Party" value={`${booking.trip.numberOfTravellers} × ${booking.trip.cabinClass}`} />
            <Row label="Purpose" value={booking.trip.tripPurpose} />
          </div>
        </div>

        <div className="glass-strong rounded-2xl p-5">
          <h2 className="text-xs font-semibold uppercase tracking-wider text-[var(--accent)] mb-3">{booking.plan.label}</h2>
          <div className="glass rounded-xl p-4 text-sm space-y-2">
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Flights</span><span className="text-[var(--text)]">{cur} {booking.plan.flightCost.toLocaleString()}</span>
            </div>
            <div className="flex justify-between text-[var(--text-muted)]">
              <span>Hotel ({booking.trip.numberOfNights}n)</span><span className="text-[var(--text)]">{cur} {booking.plan.hotelCost.toLocaleString()}</span>
            </div>
            {transfer && (
              <div className="flex justify-between text-[var(--text-muted)]">
                <span>Transfer</span><span className="text-[var(--text)]">{cur} {booking.plan.transferCost.toLocaleString()}</span>
              </div>
            )}
            <div className="flex justify-between pt-2 border-t border-[var(--border)]">
              <span className="font-semibold">Estimated total</span>
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
            <p className="font-semibold text-lg">{hotel.name}</p>
            <p className="text-[var(--text-muted)] mt-1">{hotel.location}</p>
          </div>
          <span className="text-[var(--accent)] font-semibold">{hotel.stars}-star</span>
        </div>
        <div className="grid sm:grid-cols-3 gap-3 text-sm mb-4">
          <InfoBox label="Check-in" value={hotel.checkIn} />
          <InfoBox label="Check-out" value={hotel.checkOut} />
          <InfoBox label="Per night" value={`${cur} ${hotel.nightlyRate.toLocaleString()}`} />
        </div>
      </div>

      <div className="text-center">
        <div className="flex items-center justify-center gap-3">
          <Link href="/trips"><Button variant="outline">My trips</Button></Link>
          <Link href="/"><Button>Plan another trip</Button></Link>
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
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--accent)]" />
            <div className="flex-1 border-t border-dashed border-[var(--border-strong)]" />
          </div>
          {flight.layovers.length > 0 ? (
            <span className="text-xs text-[var(--accent)]">
              Connects in {flight.layovers.map((l) => stripCode(l.airport)).join(", ")}
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
