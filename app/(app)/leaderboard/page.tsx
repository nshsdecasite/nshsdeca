import type { Metadata } from "next";
import { getMyProfile, listLeaderboard } from "@/app/platform/actions";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { displayName, requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Leaderboard",
};

export default async function LeaderboardPage() {
  await requireAuth("/leaderboard");
  const [entries, profile] = await Promise.all([listLeaderboard(), getMyProfile()]);

  return (
    <SocialPage>
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        eyebrow="Progress"
        title="Chapter leaderboard"
        description="Rankings by total points earned from practice tests and flashcards."
      />

      <div className="overflow-hidden rounded-2xl border border-border/60 bg-card shadow-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-muted text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            <tr>
              <th className="px-5 py-3">Rank</th>
              <th className="px-5 py-3">Member</th>
              <th className="px-5 py-3">Grade</th>
              <th className="px-5 py-3 text-right">Points</th>
            </tr>
          </thead>
          <tbody>
            {entries.map((entry) => {
              const isMe = entry.user_id === profile?.id;
              return (
                <tr
                  key={entry.user_id}
                  className={isMe ? "bg-primary/10" : "border-t border-border/60"}
                >
                  <td className="px-5 py-4 font-semibold tabular-nums text-foreground">
                    #{entry.rank}
                  </td>
                  <td className="px-5 py-4 font-medium text-foreground">
                    {displayName(entry.first_name, entry.last_name)}
                    {isMe ? (
                      <span className="ml-2 text-xs font-semibold text-primary">You</span>
                    ) : null}
                  </td>
                  <td className="px-5 py-4 text-muted-foreground tabular-nums">
                    {entry.grade_level ?? "—"}
                  </td>
                  <td className="px-5 py-4 text-right font-semibold tabular-nums text-primary">
                    {entry.total_points}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </SocialPage>
  );
}
