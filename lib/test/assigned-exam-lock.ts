import { loadMyProfile } from "@/lib/data/request-cache";
import { createClient } from "@/lib/supabase/server";
import { hasCompletedAssignedExam, isAssignedExamWindow } from "@/lib/test/exam-window";
import type { ExamSummary, TestSessionSummary } from "@/lib/test/types";

export async function isAssignedExamLocked() {
  if (!isAssignedExamWindow()) return false;

  const supabase = await createClient();
  const [profile, examsResult, sessionsResult] = await Promise.all([
    loadMyProfile(),
    supabase.rpc("list_exams"),
    supabase.rpc("list_my_test_sessions"),
  ]);
  if (examsResult.error) throw new Error(examsResult.error.message);
  if (sessionsResult.error) throw new Error(sessionsResult.error.message);

  const exams = (examsResult.data ?? []) as ExamSummary[];
  const sessions = (sessionsResult.data ?? []) as TestSessionSummary[];
  return !hasCompletedAssignedExam(
    sessions,
    profile?.cluster_slug,
    profile?.cluster_name,
    exams,
  );
}
