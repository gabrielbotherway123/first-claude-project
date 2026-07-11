import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { rateLimit } from "@/lib/cache";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`hotels:book:${session.user.id}`, 5, 60 * 60_000)) {
    return NextResponse.json({ error: "Too many booking attempts" }, { status: 429 });
  }

  try {
    const body = await req.json();

    const order = await prisma.hotelOrder.create({
      data: {
        userId: session.user.id,
        duffelBookingId: `booking_${Date.now()}`,
        bookingReference: `HT-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        status: "confirmed",
        liveMode: false,
        totalAmount: body.expectedTotal || 0,
        currency: body.expectedCurrency || "USD",
        accommodationName: body.accommodationName || "",
        city: body.city || "",
        checkInDate: body.checkInDate || "",
        checkOutDate: body.checkOutDate || "",
        roomName: body.roomName || "",
        guests: JSON.stringify(body.guests || []),
      },
    });

    return NextResponse.json({ orderId: order.id, reference: order.bookingReference });
  } catch (err) {
    console.error("Hotel booking error:", err);
    return NextResponse.json({ error: "Booking failed." }, { status: 500 });
  }
}
