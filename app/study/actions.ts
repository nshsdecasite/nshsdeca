"use server";

import { unstable_cache } from "next/cache";
import { requireAuth } from "@/lib/auth/roles";
import type {
  PiDetail,
  PiFilterOptions,
  PiSummary,
} from "@/lib/study/pi-types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getSupabase() {
  return createClient();
}

function optionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function mapPiSummaries(rows: Record<string, unknown>[] | null): PiSummary[] {
  return (rows ?? []).map((row) => ({
    ...row,
    question_count: Number(row.question_count ?? 0),
    roleplay_count: Number(row.roleplay_count ?? 0),
  })) as PiSummary[];
}

const loadPerformanceIndicators = unstable_cache(
  async (search: string, iaCode: string, clusterSlug: string, limit: number, offset: number) => {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("list_performance_indicators", {
      p_search: search || null,
      p_ia_code: iaCode || null,
      p_cluster_slug: clusterSlug || null,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw new Error(error.message);
    return mapPiSummaries(data as Record<string, unknown>[] | null);
  },
  ["pi-browser"],
  { revalidate: 60 },
);

export async function listPerformanceIndicators(input?: {
  search?: string;
  iaCode?: string;
  clusterSlug?: string;
  limit?: number;
  offset?: number;
}): Promise<PiSummary[]> {
  await requireAuth();
  const search = optionalText(input?.search) ?? "";
  const iaCode = optionalText(input?.iaCode) ?? "";
  const clusterSlug = optionalText(input?.clusterSlug) ?? "";
  const limit = input?.limit ?? 48;
  const offset = input?.offset ?? 0;

  try {
    return await loadPerformanceIndicators(search, iaCode, clusterSlug, limit, offset);
  } catch {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc("list_performance_indicators", {
      p_search: search || null,
      p_ia_code: iaCode || null,
      p_cluster_slug: clusterSlug || null,
      p_limit: limit,
      p_offset: offset,
    });
    if (error) throw new Error(error.message);
    return mapPiSummaries(data as Record<string, unknown>[] | null);
  }
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

const getCachedPiFilterOptions = unstable_cache(
  async () => {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("list_pi_filter_options");
    if (error) throw new Error(error.message);
    return data as PiFilterOptions;
  },
  ["pi-filter-options"],
  { revalidate: 3600 },
);

export async function getPiFilterOptions(): Promise<PiFilterOptions> {
  await requireAuth();
  return getCachedPiFilterOptions();
}

export async function searchPisForTest(search?: string) {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("search_pis_for_test", {
    p_search: optionalText(search) ?? null,
    p_limit: 40,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as { id: string; pi_code: string; indicator_text: string; question_count: number }[];
}
