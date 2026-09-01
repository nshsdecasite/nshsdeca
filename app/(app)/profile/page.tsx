import type { Metadata } from "next";
import { getMyProfile } from "@/app/platform/actions";
import { ProfileForm } from "@/components/platform/ProfileForm";
import { EmptyState } from "@/components/layout/empty-state";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { displayName, requireAuth } from "@/lib/auth/roles";
import { signOut } from "@/app/auth/actions";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  await requireAuth("/profile");
  const profile = await getMyProfile();

  if (!profile) {
    return (
      <SocialPage>
        <PageHeader
          backHref="/dashboard"
          backLabel="Dashboard"
          eyebrow="Account"
          title="Profile"
          description="Your account details could not be loaded."
        />
        <EmptyState
          title="Profile not found"
          description="Your login exists, but the chapter profile did not load. Try signing out and back in. If it keeps happening, ask an officer to check your account."
          action={
            <form action={signOut}>
              <Button type="submit">Sign out</Button>
            </form>
          }
        />
      </SocialPage>
    );
  }

  return (
    <SocialPage>
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        eyebrow="Account"
        title={displayName(profile.first_name, profile.last_name, profile.email)}
        description={`${profile.school_name ?? "Newman Smith"} · ${profile.total_points} points`}
      />
      <ProfileForm profile={profile} />
    </SocialPage>
  );
}
