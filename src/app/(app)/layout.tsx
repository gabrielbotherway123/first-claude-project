import { getCurrentProfile } from "@/lib/user";
import { AppNav } from "@/components/app-nav";

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getCurrentProfile();

  return (
    <div className="min-h-screen">
      <AppNav name={profile.name} email={profile.email} image={profile.image} />
      {children}
    </div>
  );
}
