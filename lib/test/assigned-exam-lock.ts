import { loadMyProfile } from "@/lib/data/request-cache";
import { createClient } from "@/lib/supabase/server";
import { listExamCatalog } from "@/lib/test/exam-catalog";
import { hasCompletedAssignedExam, isAssignedExamWindow } from "@/lib/test/exam-window";
import type { TestSessionSummary } from "@/lib/test/types";

export async function isAssignedExamLocked() {
  if (!isAssignedExamWindow()) return false;

  const supabase = await createClient();
  const [profile, exams, sessionsResult] = await Promise.all([
    loadMyProfile(),
    listExamCatalog(),
    supabase.rpc("list_my_test_sessions"),
  ]);
  if (sessionsResult.error) throw new Error(sessionsResult.error.message);

  const sessions = (sessionsResult.data ?? []) as TestSessionSummary[];
  return !hasCompletedAssignedExam(
    sessions,
    profile?.cluster_slug,
    profile?.cluster_name,
    exams,
  );
}
