import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/auth";
import { rateLimit } from "@/lib/cache";

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session?.user?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!rateLimit(`hotels:rates:${session.user.id}`, 20, 60_000)) {
    return NextResponse.json({ error: "Too many requests" }, { status: 429 });
  }

  try {
    const body = await req.json();
    return NextResponse.json({
      accommodationName: body.accommodationName || "Hotel",
      address: "",
      city: body.city || "",
      rates: [],
    });
  } catch (err) {
    console.error("Hotel rates error:", err);
    return NextResponse.json({ error: "Failed to load rates." }, { status: 500 });
  }
}
