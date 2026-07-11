import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  try {
    const body = await req.json();
    
    // Placeholder: In production, this would call Duffel's order API
    // For now, create a test booking record
    const order = await prisma.flightOrder.create({
      data: {
        userId: session.user.id,
        duffelOrderId: `order_${Date.now()}`,
        bookingReference: `FL-${Math.random().toString(36).slice(2, 10).toUpperCase()}`,
        status: "confirmed",
        liveMode: false,
        totalAmount: body.expectedTotal || 0,
        currency: body.expectedCurrency || "USD",
        originCity: body.origin || "",
        destinationCity: body.destination || "",
        departureDate: body.departureDate || "",
        returnDate: body.returnDate || null,
        cabinClass: body.cabinClass || "economy",
        airlineName: body.airlineName || "Unknown",
        airlineCode: body.airlineCode || "XX",
        passengers: JSON.stringify([]),
        flights: JSON.stringify([]),
      },
    });

    return NextResponse.json({ orderId: order.id, pnr: order.bookingReference });
  } catch (err) {
    console.error("Flight booking error:", err);
    return NextResponse.json({ error: "Booking failed." }, { status: 500 });
  }
}
