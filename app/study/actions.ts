"use server";

import { requireAuth } from "@/lib/auth/roles";
import type {
  PiDetail,
  PiFilterOptions,
  PiSummary,
} from "@/lib/study/pi-types";
import { createClient } from "@/lib/supabase/server";

async function getSupabase() {
  return createClient();
}

function optionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function listPerformanceIndicators(input?: {
  search?: string;
  iaCode?: string;
  clusterSlug?: string;
  limit?: number;
  offset?: number;
}): Promise<PiSummary[]> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("list_performance_indicators", {
    p_search: optionalText(input?.search) ?? null,
    p_ia_code: optionalText(input?.iaCode) ?? null,
    p_cluster_slug: optionalText(input?.clusterSlug) ?? null,
    p_limit: input?.limit ?? 48,
    p_offset: input?.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  return (data ?? []).map((row: Record<string, unknown>) => ({
    ...row,
    question_count: Number(row.question_count ?? 0),
    roleplay_count: Number(row.roleplay_count ?? 0),
  })) as PiSummary[];
}

export async function getPerformanceIndicator(
  id: string,
): Promise<PiDetail | null> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_performance_indicator", {
    p_id: id,
  });
  if (error) throw new Error(error.message);
  if (!data) return null;

  const detail = data as Record<string, unknown>;
  return {
    ...(detail as PiDetail),
    question_count: Number(detail.question_count ?? 0),
    roleplay_count: Number(detail.roleplay_count ?? 0),
    questions: (detail.questions as PiDetail["questions"]) ?? [],
    roleplay_contexts: (detail.roleplay_contexts as PiDetail["roleplay_contexts"]) ?? [],
  };
}

export async function getPiFilterOptions(): Promise<PiFilterOptions> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("list_pi_filter_options");
  if (error) throw new Error(error.message);
  return data as PiFilterOptions;
}
