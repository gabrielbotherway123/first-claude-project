import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui";

export const metadata = { title: "My Trips · Atlas" };

export default async function TripsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const [trips, flightOrders, hotelOrders] = await Promise.all([
    prisma.trip.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
      include: { booking: { include: { plan: true } } },
    }),
    prisma.flightOrder.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
    prisma.hotelOrder.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: "desc" },
    }),
  ]);

  return (
    <div className="max-w-4xl mx-auto px-4 py-10">
      <div className="flex items-end justify-between mb-8">
        <div>
          <h1 className="text-3xl font-semibold tracking-tight">My trips</h1>
          <p className="text-[var(--text-muted)] mt-1">
            {trips.length === 0
              ? "Your planned and booked journeys will appear here."
              : `${trips.length} ${trips.length === 1 ? "journey" : "journeys"} planned.`}
          </p>
        </div>
        <Link href="/">
          <Button>+ New trip</Button>
        </Link>
      </div>

      {trips.length === 0 ? (
        <div className="glass-strong rounded-2xl p-12 text-center fade-in-up">
          <div className="text-5xl mb-4">🧭</div>
          <h2 className="text-xl font-semibold mb-2">No trips yet</h2>
          <p className="text-[var(--text-muted)] mb-6">Plan your first journey to get started.</p>
          <Link href="/">
            <Button>Plan a trip</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip, i) => {
            let destinations: string[] = [];
            try {
              const parsed = JSON.parse(trip.destinations);
              if (Array.isArray(parsed)) destinations = parsed;
            } catch {
              // fall through with an empty list rather than 500ing the page
            }
            const booked = Boolean(trip.booking);
            const href = booked ? `/booking/${trip.booking!.id}` : `/plans/${trip.id}`;
            return (
              <Link key={trip.id} href={href}>
                <div
                  className="glass-strong rounded-2xl p-5 flex items-center gap-5 hover:border-[var(--accent)] transition-colors fade-in-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="w-12 h-12 rounded-xl accent-gradient flex items-center justify-center text-[var(--accent-contrast)] text-xl shrink-0">
                    ✈
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      {trip.originCity.replace(/\s*\(.*\)/, "")} →{" "}
                      {destinations.map((d) => d.replace(/\s*\(.*\)/, "")).join(" → ")}
                    </p>
                    <p className="text-sm text-[var(--text-dim)]">
                      {trip.departureDate} – {trip.returnDate} · {trip.numberOfNights} nights ·{" "}
                      {trip.numberOfTravellers} {trip.numberOfTravellers === 1 ? "traveller" : "travellers"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    {booked ? (
                      <>
                        <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--success)]/15 text-[var(--success)] mb-1">
                          Booked
                        </span>
                        <p className="text-sm text-[var(--text-muted)]">
                          {trip.currency} {trip.booking!.plan.totalCost.toLocaleString()}
                        </p>
                        <p className="text-xs text-[var(--text-dim)] font-mono">
                          {trip.booking!.reference}
                        </p>
                      </>
                    ) : (
                      <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--accent-soft)] text-[var(--accent)]">
                        Review options
                      </span>
                    )}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {flightOrders.length > 0 && (
        <div className="mt-10">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Flight bookings</h2>
              <p className="text-[var(--text-muted)] mt-1 text-sm">
                Flights booked directly through Atlas.
              </p>
            </div>
            <Link href="/flights">
              <Button variant="outline">+ Book a flight</Button>
            </Link>
          </div>
          <div className="space-y-3">
            {flightOrders.map((order, i) => (
              <Link key={order.id} href={`/flights/orders/${order.id}`}>
                <div
                  className="glass-strong rounded-2xl p-5 flex items-center gap-5 hover:border-[var(--accent)] transition-colors fade-in-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="w-12 h-12 rounded-xl accent-gradient flex items-center justify-center text-[var(--accent-contrast)] text-xl shrink-0">
                    ✈
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">
                      {order.originCity} → {order.destinationCity}
                    </p>
                    <p className="text-sm text-[var(--text-dim)]">
                      {order.departureDate}
                      {order.returnDate ? ` – ${order.returnDate}` : " · one-way"} · {order.airlineName}
                      {order.liveMode ? "" : " · test"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--success)]/15 text-[var(--success)] mb-1 capitalize">
                      {order.status}
                    </span>
                    <p className="text-sm text-[var(--text-muted)]">
                      {order.currency} {order.totalAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-[var(--text-dim)] font-mono">{order.bookingReference || "Pending"}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}

      {hotelOrders.length > 0 && (
        <div className="mt-10">
          <div className="flex items-end justify-between mb-5">
            <div>
              <h2 className="text-xl font-semibold tracking-tight">Hotel bookings</h2>
              <p className="text-[var(--text-muted)] mt-1 text-sm">
                Stays booked directly through Atlas.
              </p>
            </div>
          </div>
          <div className="space-y-3">
            {hotelOrders.map((order, i) => (
              <Link key={order.id} href={`/hotels/orders/${order.id}`}>
                <div
                  className="glass-strong rounded-2xl p-5 flex items-center gap-5 hover:border-[var(--accent)] transition-colors fade-in-up"
                  style={{ animationDelay: `${i * 0.05}s` }}
                >
                  <div className="w-12 h-12 rounded-xl accent-gradient flex items-center justify-center text-[var(--accent-contrast)] text-xl shrink-0">
                    ⌂
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold truncate">{order.accommodationName}</p>
                    <p className="text-sm text-[var(--text-dim)]">
                      {order.city} · {order.checkInDate} – {order.checkOutDate}
                      {order.liveMode ? "" : " · test"}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <span className="inline-block px-2.5 py-1 rounded-full text-xs font-semibold bg-[var(--success)]/15 text-[var(--success)] mb-1 capitalize">
                      {order.status}
                    </span>
                    <p className="text-sm text-[var(--text-muted)]">
                      {order.currency} {order.totalAmount.toLocaleString()}
                    </p>
                    <p className="text-xs text-[var(--text-dim)] font-mono">{order.bookingReference || "Pending"}</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
