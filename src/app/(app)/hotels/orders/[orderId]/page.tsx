import Link from "next/link";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Button } from "@/components/ui";

export const metadata = { title: "Stay booked · Atlas" };

function money(amount: number, currency: string) {
  return `${currency} ${amount.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

export default async function HotelOrderPage({
  params,
}: {
  params: Promise<{ orderId: string }>;
}) {
  const { orderId } = await params;
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const order = await prisma.hotelOrder.findUnique({ where: { id: orderId } });

  if (!order || order.userId !== session.user.id) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center gap-4">
        <p className="text-[var(--danger)]">Hotel order not found.</p>
        <Link href="/">
          <Button variant="outline">← Plan a trip</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-8 fade-in-up">
      <div className="glass-strong rounded-2xl p-8 text-center mb-6">
        <p className="text-xs tracking-[0.3em] uppercase text-[var(--success)] mb-3">Booking confirmed</p>
        <h1 className="text-2xl sm:text-3xl font-semibold mb-2">{order.accommodationName}</h1>
        <p className="text-[var(--text-muted)]">{order.city} · {order.checkInDate} – {order.checkOutDate}</p>
        <div className="mt-5 inline-block glass rounded-xl px-6 py-3">
          <p className="text-xs text-[var(--text-dim)] uppercase tracking-wider mb-1">Booking reference</p>
          <p className="text-2xl font-bold font-mono tracking-widest text-[var(--accent)]">
            {order.bookingReference || "Pending"}
          </p>
          {!order.bookingReference && (
            <p className="text-xs text-[var(--text-dim)] mt-1">
              Not yet issued by the property — check your confirmation email shortly.
            </p>
          )}
        </div>
        {!order.liveMode && (
          <p className="text-xs text-[var(--text-dim)] mt-4">
            Test-mode booking — a real order was created via the Duffel Stays API, but no real reservation was made and no money moved.
          </p>
        )}
      </div>

      <div className="glass-strong rounded-2xl p-5 mb-6">
        <div className="text-sm space-y-2">
          <div className="flex justify-between">
            <span className="text-[var(--text-dim)]">Total paid</span>
            <span className="font-bold text-[var(--accent)]">{money(order.totalAmount, order.currency)}</span>
          </div>
        </div>
      </div>

      <div className="text-center">
        <Link href="/trips">
          <Button variant="outline">My trips</Button>
        </Link>
      </div>
    </div>
  );
}
