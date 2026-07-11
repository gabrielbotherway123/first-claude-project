import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { PreferredAirline, UserProfile } from "@/lib/types";

function parseJsonArray<T>(value: string | null): T[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

/**
 * Loads the signed-in user's full profile, redirecting to sign-in if there is
 * no valid session. Memoized per render pass.
 */
export const getCurrentProfile = cache(async (): Promise<UserProfile> => {
  const session = await auth();
  if (!session?.user?.id) redirect("/sign-in");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/sign-in");

  return {
    id: user.id,
    name: user.name ?? "",
    email: user.email,
    image: user.image,
    phone: user.phone ?? "",
    defaultAirports: parseJsonArray<string>(user.defaultAirports),
    preferredAirlines: parseJsonArray<PreferredAirline>(user.preferredAirlines),
    defaultCabinClass: (user.defaultCabinClass as UserProfile["defaultCabinClass"]) ?? "",
    defaultHotelStars: user.defaultHotelStars,
    defaultLocationPreference:
      (user.defaultLocationPreference as UserProfile["defaultLocationPreference"]) ?? "",
    defaultAmenities: parseJsonArray<string>(user.defaultAmenities),
    standingRequirements: user.standingRequirements ?? "",
  };
});
