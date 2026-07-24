"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/roles";
import type { ExamSummary, TestSession, TestSessionSummary } from "@/lib/test/types";
import { createClient } from "@/lib/supabase/server";

async function getSupabase() {
  return createClient();
}

export async function listExams(): Promise<ExamSummary[]> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("list_exams");
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    question_count: Number(row.question_count ?? 0),
  })) as ExamSummary[];
}

export async function listTestSessions(): Promise<TestSessionSummary[]> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("list_my_test_sessions");
  if (error) throw new Error(error.message);
  return (data ?? []) as TestSessionSummary[];
}

export async function getTestSession(sessionId: string): Promise<TestSession | null> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_test_session", {
    p_session_id: sessionId,
  });
  if (error) throw new Error(error.message);
  return (data as TestSession | null) ?? null;
}

export async function startFullExam(examId: string) {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("create_test_session", {
    p_exam_id: examId,
    p_session_type: "full",
  });
  if (error) throw new Error(error.message);
  const session = data as { id: string };
  redirect(`/tests/${session.id}`);
}

export async function saveAnswer(
  sessionId: string,
  questionId: string,
  choiceId: string,
) {
  await requireAuth();
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("save_test_answer", {
    p_session_id: sessionId,
    p_question_id: questionId,
    p_choice_id: choiceId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/tests/${sessionId}`);
}

export async function completeTest(sessionId: string) {
  await requireAuth();
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("complete_test_session", {
    p_session_id: sessionId,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/tests/${sessionId}`);
  revalidatePath("/tests/history");
  redirect(`/tests/${sessionId}`);
}
