"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth } from "@/lib/auth/roles";
import type {
  DashboardStats,
  Flashcard,
  FlashcardSetSummary,
  LeaderboardEntry,
  Note,
  UserProfile,
} from "@/lib/platform/types";
import { createClient } from "@/lib/supabase/server";

async function getSupabase() {
  return createClient();
}

export async function getDashboardStats(): Promise<DashboardStats> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_dashboard_stats");
  if (error) throw new Error(error.message);
  return data as DashboardStats;
}

export async function getMyProfile(): Promise<UserProfile | null> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_my_profile");
  if (error) throw new Error(error.message);
  return (data as UserProfile | null) ?? null;
}

export async function updateMyProfile(input: {
  firstName?: string;
  lastName?: string;
  gradeLevel?: number;
  isPublicOnLeaderboard?: boolean;
}) {
  await requireAuth();
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("update_my_profile", {
    p_first_name: input.firstName ?? null,
    p_last_name: input.lastName ?? null,
    p_grade_level: input.gradeLevel ?? null,
    p_is_public_on_leaderboard: input.isPublicOnLeaderboard ?? null,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/profile");
  revalidatePath("/leaderboard");
}

export async function listLeaderboard(): Promise<LeaderboardEntry[]> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("list_leaderboard", { p_limit: 50 });
  if (error) throw new Error(error.message);
  return ((data ?? []) as LeaderboardEntry[]).map((row) => ({
    ...row,
    rank: Number(row.rank),
    total_points: Number(row.total_points),
  }));
}

export async function listNotes(): Promise<Note[]> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("list_my_notes");
  if (error) throw new Error(error.message);
  return (data ?? []) as Note[];
}

export async function saveNote(input: {
  id?: string;
  tabName: string;
  text: string;
}) {
  await requireAuth();
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("upsert_note", {
    p_id: input.id ?? null,
    p_tab_name: input.tabName,
    p_content: { text: input.text },
  });
  if (error) throw new Error(error.message);
  revalidatePath("/notes");
}

export async function deleteNote(id: string) {
  await requireAuth();
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("delete_note", { p_id: id });
  if (error) throw new Error(error.message);
  revalidatePath("/notes");
}

export async function listFlashcardSets(): Promise<FlashcardSetSummary[]> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("list_pi_flashcard_sets");
  if (error) throw new Error(error.message);
  return ((data ?? []) as FlashcardSetSummary[]).map((row) => ({
    ...row,
    card_count: Number(row.card_count),
    known_count: Number(row.known_count),
  }));
}

export async function getFlashcardSet(setId: string): Promise<{
  id: string;
  title: string;
  cards: Flashcard[];
} | null> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_pi_flashcard_set", {
    p_set_id: setId,
  });
  if (error) throw new Error(error.message);
  return (data as { id: string; title: string; cards: Flashcard[] } | null) ?? null;
}

export async function markFlashcardKnown(flashcardId: string) {
  await requireAuth();
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("update_flashcard_progress", {
    p_flashcard_id: flashcardId,
    p_status: "know_it",
  });
  if (error) throw new Error(error.message);
}

export async function markFlashcardLearning(flashcardId: string) {
  await requireAuth();
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("update_flashcard_progress", {
    p_flashcard_id: flashcardId,
    p_status: "learning",
  });
  if (error) throw new Error(error.message);
}

export async function startCustomTest(input: {
  questionCount: number;
  clusterSlug?: string;
  iaCode?: string;
  piId?: string;
}) {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("create_custom_test_session", {
    p_question_count: input.questionCount,
    p_cluster_slug: input.clusterSlug ?? null,
    p_ia_code: input.iaCode ?? null,
    p_pi_id: input.piId ?? null,
  });
  if (error) throw new Error(error.message);
  const session = data as { id: string };
  redirect(`/tests/${session.id}`);
}

export async function startPiTargetedTest(questionCount = 15) {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("create_pi_targeted_test_session", {
    p_question_count: questionCount,
  });
  if (error) throw new Error(error.message);
  const session = data as { id: string };
  redirect(`/tests/${session.id}`);
}
