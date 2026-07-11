import { getCurrentProfile } from "@/lib/user";
import { duffelStaysConfigured } from "@/lib/duffel-stays";
import { HotelBooking, type HotelCheckoutParams } from "@/components/hotel-booking";

export const metadata = { title: "Book your stay · Atlas" };

function first(v: string | string[] | undefined): string {
  return Array.isArray(v) ? (v[0] ?? "") : (v ?? "");
}

export default async function HotelBookPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const sp = await searchParams;
  const profile = await getCurrentProfile();

  const rawAccommodationId = first(sp.accommodationId);
  const accommodationId = /^acc_[A-Za-z0-9]+$/.test(rawAccommodationId) ? rawAccommodationId : "";
  const city = first(sp.city);
  const checkIn = first(sp.checkIn);
  const checkOut = first(sp.checkOut);
  const adults = Math.min(9, Math.max(1, parseInt(first(sp.adults), 10) || 1));

  // A specific hotel (accommodationId) OR a destination city is enough — with a
  // city alone, Atlas searches Duffel Stays and books the best-value room.
  if (!city || !checkIn || !checkOut) {
    return (
      <div className="max-w-2xl mx-auto px-4 py-16 text-center">
        <h1 className="text-2xl font-semibold mb-3">Hotel not found</h1>
        <p className="text-[var(--text-muted)]">This booking link is missing required details — go back and pick a hotel again.</p>
      </div>
    );
  }

  const params: HotelCheckoutParams = { accommodationId, city, checkIn, checkOut, adults };

  return (
    <HotelBooking
      configured={duffelStaysConfigured()}
      params={params}
      contact={{ name: profile.name, email: profile.email, phone: profile.phone }}
    />
  );
}
