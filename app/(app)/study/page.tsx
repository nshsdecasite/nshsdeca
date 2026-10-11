import type { Metadata } from "next";
import {
  getDashboardStats,
  getMyPiHeatmap,
  listFlashcardSets,
} from "@/app/platform/actions";
import { StudyHubScreen } from "@/components/deca/study-hub-screen";
import { iaName } from "@/lib/deca/placeholder";
import { requireAuth } from "@/lib/auth/roles";
import { loadMyProfile } from "@/lib/data/request-cache";

export const metadata: Metadata = {
  title: "Study tools",
};

export default async function StudyPage() {
  await requireAuth("/study");
  const [stats, heatmap, sets, profile] = await Promise.all([
    getDashboardStats(),
    getMyPiHeatmap(),
    listFlashcardSets().catch(() => []),
    loadMyProfile(),
  ]);

  const openSession = (stats.recent_sessions ?? []).find((session) => !session.completed_at);
  const lastSession = (stats.recent_sessions ?? [])[0];
  const weakest = [...heatmap].sort((a, b) => a.accuracy - b.accuracy)[0];
  const dueCards = sets.reduce(
    (sum, set) => sum + Math.max(0, set.card_count - set.known_count),
    0,
  );

  return (
    <StudyHubScreen
      resumeHref={openSession ? `/tests/${openSession.id}` : lastSession ? `/tests/${lastSession.id}` : undefined}
      resumeTitle={
        openSession?.title ??
        lastSession?.title ??
        (openSession || lastSession ? "Practice exam" : undefined)
      }
      resumeProgress={
        openSession && openSession.total_questions
          ? (openSession.score ?? 0) / openSession.total_questions
          : undefined
      }
      resumeMeta={
        openSession
          ? `${openSession.total_questions} questions · in progress`
          : lastSession?.completed_at
            ? "Last completed exam"
            : undefined
      }
      dueCards={dueCards}
      streak={0}
      weakestName={weakest ? iaName(weakest.instructional_area_code) : undefined}
      weakestAccuracy={weakest ? Math.round(weakest.accuracy) : undefined}
      decks={sets.map((set) => ({
        id: set.id,
        title: set.title,
        count: set.card_count,
        mastered: set.known_count,
      }))}
      eventCode={profile?.event_code ?? undefined}
      eventName={profile?.event_name ?? undefined}
      clusterName={profile?.cluster_name ?? undefined}
    />
  );
}
