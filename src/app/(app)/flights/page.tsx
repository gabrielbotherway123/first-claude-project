import { getCurrentProfile } from "@/lib/user";
import { FlightBooking, type FlightsPrefill } from "@/components/flight-booking";

export const metadata = { title: "Book a flight · Atlas" };

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function FlightsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const profile = await getCurrentProfile();

  const prefill: FlightsPrefill = {
    origin: first(sp.origin) || "",
    destination: first(sp.destination) || "",
    depart: first(sp.depart) || "",
    return: first(sp.return) || "",
    adults: Math.max(1, Math.min(9, parseInt(first(sp.adults), 10) || 1)),
    cabin: first(sp.cabin) || "economy",
    autoSearch: sp.autoSearch === "true",
  };

  const liveMode = process.env.DUFFEL_ACCESS_TOKEN?.startsWith("duffel_live_") ?? false;

  return (
    <FlightBooking
      configured={Boolean(process.env.DUFFEL_ACCESS_TOKEN)}
      liveMode={liveMode}
      prefill={prefill}
      contact={{ name: profile.name, email: profile.email, phone: profile.phone }}
    />
  );
}
