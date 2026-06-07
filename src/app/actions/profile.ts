"use server";

import { revalidatePath } from "next/cache";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import type { PreferredAirline } from "@/lib/types";

export type ProfileInput = {
  name: string;
  phone: string;
  defaultAirports: string[];
  preferredAirlines: PreferredAirline[];
  defaultCabinClass: string;
  defaultHotelStars: number | null;
  defaultLocationPreference: string;
  standingRequirements: string;
};

export async function saveProfileAction(
  input: ProfileInput
): Promise<{ ok: boolean; error?: string }> {
  const session = await auth();
  if (!session?.user?.id) return { ok: false, error: "Not signed in." };

  const defaultAirports = input.defaultAirports
    .map((a) => a.trim())
    .filter(Boolean);
  const preferredAirlines = input.preferredAirlines
    .filter((a) => a.airline.trim())
    .map((a) => ({ airline: a.airline.trim(), rewardsNumber: a.rewardsNumber.trim() }));

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: input.name.trim() || null,
      phone: input.phone.trim() || null,
      defaultAirports: JSON.stringify(defaultAirports),
      preferredAirlines: JSON.stringify(preferredAirlines),
      defaultCabinClass: input.defaultCabinClass || null,
      defaultHotelStars: input.defaultHotelStars,
      defaultLocationPreference: input.defaultLocationPreference || null,
      standingRequirements: input.standingRequirements.trim() || null,
    },
  });

  revalidatePath("/profile");
  revalidatePath("/");
  return { ok: true };
}
