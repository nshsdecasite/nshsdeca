import type { Metadata } from "next";
import { getMyProfile, listLeaderboard, listWeeklyLeaderboard } from "@/app/platform/actions";
import { LeaderboardBoard } from "@/components/platform/LeaderboardBoard";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Leaderboard",
};

export default async function LeaderboardPage() {
  await requireAuth("/leaderboard");
  const [allTime, weekly, profile] = await Promise.all([
    listLeaderboard(),
    listWeeklyLeaderboard(),
    getMyProfile(),
  ]);

  return (
    <SocialPage>
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        eyebrow="Progress"
        title="Chapter leaderboard"
        description="Rankings by points earned from practice tests and flashcards. Weekly totals reset every 7 days."
      />
      <LeaderboardBoard
        allTime={allTime}
        weekly={weekly}
        currentUserId={profile?.id}
      />
    </SocialPage>
  );
}
