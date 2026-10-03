import type { Metadata } from "next";
import { listSubmissions } from "@/app/roleplay/actions";
import {
  getDashboardStats,
  getMyPiHeatmap,
  getMyProfile,
  listLeaderboard,
} from "@/app/platform/actions";
import { DashboardScreen } from "@/components/deca/dashboard-screen";
import { displayName, requireAuth } from "@/lib/auth/roles";
import { iaName } from "@/lib/deca/placeholder";
import { getTotalScore } from "@/lib/roleplay/types";
import type { PiHeatmapCell } from "@/lib/platform/types";

export const metadata: Metadata = {
  title: "Dashboard",
};

function groupAccuracy(cells: PiHeatmapCell[]) {
  const map = new Map<string, { attempts: number; correct: number; name: string }>();
  for (const cell of cells) {
    const name = iaName(cell.instructional_area_code);
    const prev = map.get(name) ?? { attempts: 0, correct: 0, name };
    prev.attempts += cell.total_attempts;
    prev.correct += cell.correct_count;
    map.set(name, prev);
  }
  return [...map.values()]
    .map((row) => ({
      name: row.name,
      accuracy: row.attempts ? Math.round((row.correct / row.attempts) * 100) : 0,
    }))
    .sort((a, b) => b.accuracy - a.accuracy)
    .slice(0, 5);
}

function streakFrom(dates: string[]) {
  const days = new Set(
    dates
      .map((value) => {
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
      })
      .filter((value): value is string => Boolean(value)),
  );
  if (days.size === 0) return 0;
  const cursor = new Date();
  const iso = (date: Date) => date.toISOString().slice(0, 10);
  if (!days.has(iso(cursor))) {
    cursor.setDate(cursor.getDate() - 1);
    if (!days.has(iso(cursor))) return 0;
  }
  let streak = 0;
  while (days.has(iso(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export default async function DashboardPage() {
  await requireAuth("/dashboard");
  const [profile, stats, heatmap, leaderboard, submissions] = await Promise.all([
    getMyProfile(),
    getDashboardStats(),
    getMyPiHeatmap(),
    listLeaderboard().catch(() => []),
    listSubmissions().catch(() => []),
  ]);

  const name = displayName(profile?.first_name, profile?.last_name, profile?.email);
  const accuracy = groupAccuracy(heatmap);
  const questionCount = heatmap.reduce((sum, cell) => sum + cell.total_attempts, 0);
  const correctCount = heatmap.reduce((sum, cell) => sum + cell.correct_count, 0);
  const examAccuracy = questionCount
    ? Math.round((correctCount / questionCount) * 100)
    : null;
  const mastered = heatmap.filter((cell) => cell.accuracy >= 70);

  const reviewed = submissions.filter((item) => item.status === "reviewed");
  const roleplayScores = reviewed
    .map((item) => (item.grading_data ? getTotalScore(item.grading_data.rubric) : null))
    .filter((value): value is number => value != null);
  const roleplayAverage = roleplayScores.length
    ? Math.round(roleplayScores.reduce((sum, score) => sum + score, 0) / roleplayScores.length)
    : null;

  const waiting = submissions
    .filter((item) => item.status === "submitted" || item.status === "under_review")
    .map((item) => ({
      name:
        item.scenario_title ||
        [item.event_code, item.event_name].filter(Boolean).join(" ") ||
        "Roleplay",
      status: item.status === "under_review" ? "UNDER REVIEW" : "SUBMITTED",
      live: item.status === "under_review",
    }));

  const trend = (stats.recent_sessions ?? [])
    .filter((session) => session.completed_at && session.score != null)
    .slice(0, 8)
    .reverse()
    .map((session) => ({
      label: new Date(session.completed_at ?? session.started_at).toLocaleDateString(
        "en-US",
        { month: "short", day: "numeric" },
      ).toUpperCase(),
      score: session.total_questions
        ? Math.round(((session.score ?? 0) / session.total_questions) * 100)
        : 0,
    }));

  const weakPis = (stats.weak_pis ?? []).slice(0, 3).map((pi) => ({
    code: pi.pi_code,
    text: pi.indicator_text,
    meta: `${pi.accuracy}% · ${pi.total_attempts} ATTEMPTS`,
    href: `/study/pis/${pi.id}`,
  }));

  const standing = leaderboard.find((entry) => entry.user_id === profile?.id);
  const standingNote =
    standing && standing.rank > 1
      ? `Keep working the weak indicators. A graded roleplay is worth 15.`
      : standing?.rank === 1
        ? "First in the chapter this season."
        : undefined;

  const activityDates = [
    ...(stats.recent_sessions ?? [])
      .map((session) => session.completed_at)
      .filter((value): value is string => Boolean(value)),
    ...reviewed.map((item) => item.reviewed_at ?? item.submitted_at),
  ];
  const streak = streakFrom(activityDates);

  return (
    <DashboardScreen
      name={name}
      examAccuracy={examAccuracy}
      roleplayAverage={roleplayAverage}
      roleplayAttempts={reviewed.length}
      streak={streak}
      bestStreak={streak}
      masteredCount={mastered.length}
      masteredTotal={stats.total_pi_count ?? heatmap.length}
      questionCount={questionCount || undefined}
      accuracy={accuracy}
      trend={trend}
      weakPis={weakPis}
      waiting={waiting}
      standingRank={standing?.rank ?? null}
      standingOf={leaderboard.length || null}
      standingNote={standingNote}
      points={stats.total_points}
      testsTaken={stats.tests_completed}
      roleplaysGraded={stats.roleplays_graded}
    />
  );
}
