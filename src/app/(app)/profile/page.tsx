import { getCurrentProfile } from "@/lib/user";
import { ProfileForm } from "@/components/profile-form";

export const metadata = { title: "Profile · Atlas" };

export default async function ProfilePage() {
  const profile = await getCurrentProfile();
  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <ProfileForm profile={profile} />
    </div>
  );
}
