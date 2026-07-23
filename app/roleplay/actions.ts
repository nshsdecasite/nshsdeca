"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAuth, requireRole } from "@/lib/auth/roles";
import type { Grading, Submission } from "@/lib/roleplay/types";
import { createClient } from "@/lib/supabase/server";

async function getSupabase() {
  return createClient();
}

export async function listSubmissions(): Promise<Submission[]> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("list_roleplay_submissions");
  if (error) throw new Error(error.message);
  return (data ?? []) as Submission[];
}

export async function getSubmission(id: string): Promise<Submission | null> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_roleplay_submission", {
    p_id: id,
  });
  if (error) throw new Error(error.message);
  return (data as Submission | null) ?? null;
}

export async function createSubmission(input: {
  scenarioKey: string;
  videoUrl: string;
  videoSource: string;
}) {
  await requireRole(["student"], "/roleplays/submit");
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("create_roleplay_submission", {
    p_scenario_key: input.scenarioKey,
    p_video_url: input.videoUrl,
    p_video_source: input.videoSource,
  });
  if (error) throw new Error(error.message);

  revalidatePath("/submissions");
  revalidatePath("/admin/grading");
  redirect(`/submissions/${(data as Submission).id}`);
}

export async function saveGradingDraft(id: string, grading: Grading) {
  await requireRole(["officer", "advisor"]);
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("save_roleplay_grading", {
    p_id: id,
    p_grading: grading,
    p_final: false,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/grading/${id}`);
  revalidatePath("/admin/grading");
  revalidatePath(`/submissions/${id}`);
}

export async function submitFinalGrading(id: string, grading: Grading) {
  await requireRole(["officer", "advisor"]);
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("save_roleplay_grading", {
    p_id: id,
    p_grading: grading,
    p_final: true,
  });
  if (error) throw new Error(error.message);
  revalidatePath(`/admin/grading/${id}`);
  revalidatePath("/admin/grading");
  revalidatePath(`/submissions/${id}`);
}

export async function deleteSubmission(id: string) {
  await requireRole(["officer", "advisor"]);
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("delete_roleplay_submission", {
    p_id: id,
  });
  if (error) throw new Error(error.message);
  revalidatePath("/admin/grading");
  revalidatePath("/submissions");
  redirect("/admin/grading");
}
