import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui";

export const metadata = { title: "My Trips · Atlas" };

export default async function TripsPage() {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const trips = await prisma.trip.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    include: { booking: { include: { plan: true } } },
  });

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
          <p className="text-[var(--text-muted)] mb-6">
            Plan your first journey and it will be saved to your account.
          </p>
          <Link href="/">
            <Button>Plan a trip</Button>
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {trips.map((trip, i) => {
            const destinations: string[] = JSON.parse(trip.destinations);
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
    </div>
  );
}
