import type { Metadata } from "next";
import { getMyProfile } from "@/app/platform/actions";
import { ProfileForm } from "@/components/platform/ProfileForm";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { displayName, requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Profile",
};

export default async function ProfilePage() {
  await requireAuth("/profile");
  const profile = await getMyProfile();

  if (!profile) {
    return null;
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
