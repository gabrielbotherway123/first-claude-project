import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui";
import { AutoCalendar } from "@/components/auto-calendar";

export const metadata = { title: "Flight booked · Atlas" };

/** Google Calendar "add event" template link built from the booked flight. */
function calendarUrl(order: {
  originCity: string;
  destinationCity: string;
  departureDate: string;
  returnDate: string | null;
  airlineName: string;
  bookingReference: string;
}): string {
  const start = order.departureDate.replace(/-/g, "");
  const endBase = order.returnDate || order.departureDate;
  const end = new Date(endBase);
  end.setDate(end.getDate() + 1); // Google end date is exclusive for all-day
  const endStr = end.toISOString().slice(0, 10).replace(/-/g, "");
  const qs = new URLSearchParams({
    action: "TEMPLATE",
    text: `Trip to ${order.destinationCity}`,
    dates: `${start}/${endStr}`,
    details:
      `Atlas booking\nRoute: ${order.originCity} → ${order.destinationCity}\n` +
      `Airline: ${order.airlineName}\nReference: ${order.bookingReference || "pending"}`,
    location: order.destinationCity,
  });
  return `https://calendar.google.com/calendar/render?${qs.toString()}`;
}

export default async function FlightOrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderId: string }>;
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const { orderId } = await params;
  const sp = await searchParams;
  const hotelParam = Array.isArray(sp.hotel) ? sp.hotel[0] : sp.hotel;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const order = await prisma.flightOrder.findUnique({ where: { id: orderId } });

  if (!order || order.userId !== session.user.id) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--danger)]">Flight order not found.</p>
        <Link href="/">
          <Button variant="outline">← Plan a trip</Button>
        </Link>
      </div>
    );
  }

  // Resolve the hotel outcome passed from the combined "Book now".
  let hotelOrder: { id: string; accommodationName: string } | null = null;
  if (hotelParam && hotelParam !== "stays_disabled" && hotelParam !== "failed") {
    const h = await prisma.hotelOrder.findUnique({ where: { id: hotelParam } });
    if (h && h.userId === session.user.id) hotelOrder = { id: h.id, accommodationName: h.accommodationName };
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 fade-in-up">
      <div className="glass-strong rounded-2xl p-8 text-center mb-6">
        <p className="text-xs tracking-[0.3em] uppercase text-[var(--success)] mb-3">Booking confirmed</p>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2">{order.originCity} → {order.destinationCity}</h1>
        <p className="text-[var(--text-muted)]">{order.airlineName} · {order.departureDate}</p>
        <div className="mt-5 inline-block glass rounded-xl px-6 py-3">
          <p className="text-xs text-[var(--text-dim)] uppercase tracking-wider mb-1">Booking reference</p>
          <p className="text-2xl font-bold font-mono tracking-widest text-[var(--accent)]">
            {order.bookingReference || "Pending"}
          </p>
          {!order.bookingReference && (
            <p className="text-xs text-[var(--text-dim)] mt-1">
              Not yet issued by the airline — check your confirmation email shortly.
            </p>
          )}
        </div>
        {!order.liveMode && (
          <p className="text-xs text-[var(--text-dim)] mt-4">
            Test-mode booking — a real order was created via the Duffel API, but no real ticket was issued and no money moved.
          </p>
        )}
        {/* Auto-adds the trip to Google Calendar (no button). */}
        <AutoCalendar orderId={order.id} url={calendarUrl(order)} />
      </div>

      {/* Hotel outcome from the combined booking. */}
      {hotelParam && (
        <div className="glass-strong rounded-2xl p-5 mb-6 text-center">
          {hotelOrder ? (
            <p className="text-sm">
              Hotel booked too —{" "}
              <Link href={`/hotels/orders/${hotelOrder.id}`} className="text-[var(--accent)] hover:underline">
                {hotelOrder.accommodationName}
              </Link>
            </p>
          ) : hotelParam === "stays_disabled" ? (
            <p className="text-sm text-[var(--text-muted)]">
              Your flight is booked. The hotel couldn&apos;t be booked because Duffel Stays isn&apos;t enabled on this account yet — activate it in your Duffel dashboard and hotels will book automatically.
            </p>
          ) : (
            <p className="text-sm text-[var(--text-muted)]">
              Your flight is booked. We couldn&apos;t secure a hotel automatically for this destination.
            </p>
          )}
        </div>
      )}

      <div className="text-center mt-8">
        <Link href="/trips">
          <Button variant="outline">My trips</Button>
        </Link>
      </div>
    </div>
  );
}
