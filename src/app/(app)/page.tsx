import { getCurrentProfile } from "@/lib/user";
import { TripPlanner } from "@/components/trip-planner";

export default async function HomePage() {
  const profile = await getCurrentProfile();
  return <TripPlanner profile={profile} />;
}
