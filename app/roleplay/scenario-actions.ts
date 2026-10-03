"use server";

import { unstable_cache } from "next/cache";
import { requireAuth } from "@/lib/auth/roles";
import type {
  ScenarioDetail,
  ScenarioPerformanceIndicator,
  ScenarioFilterOptions,
  ScenarioSummary,
} from "@/lib/roleplay/scenario-types";
import { normalizeScenarioRubric } from "@/lib/roleplay/rubric";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

async function getSupabase() {
  return createClient();
}

function optionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const loadScenarioCatalog = unstable_cache(
  async (
    eventCode: string,
    year: number,
    level: string,
    search: string,
    clusterSlug: string,
    limit: number,
    offset: number,
  ): Promise<ScenarioSummary[]> => {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("list_scenarios", {
      p_event_code: eventCode || null,
      p_year: year > 0 ? year : null,
      p_level: level || null,
      p_search: search || null,
      p_limit: limit,
      p_offset: offset,
      p_cluster_slug: clusterSlug || null,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as ScenarioSummary[];
  },
  ["scenario-catalog"],
  { revalidate: 60 },
);

export async function listScenarios(input?: {
  eventCode?: string;
  year?: number;
  level?: string;
  search?: string;
  clusterSlug?: string;
  limit?: number;
  offset?: number;
}): Promise<ScenarioSummary[]> {
  await requireAuth();
  const eventCode = optionalText(input?.eventCode) ?? "";
  const year = input?.year ?? 0;
  const level = optionalText(input?.level) ?? "";
  const search = optionalText(input?.search) ?? "";
  const clusterSlug = optionalText(input?.clusterSlug) ?? "";
  const limit = input?.limit ?? 24;
  const offset = input?.offset ?? 0;

  try {
    return await loadScenarioCatalog(
      eventCode,
      year,
      level,
      search,
      clusterSlug,
      limit,
      offset,
    );
  } catch {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc("list_scenarios", {
      p_event_code: eventCode || null,
      p_year: year > 0 ? year : null,
      p_level: level || null,
      p_search: search || null,
      p_limit: limit,
      p_offset: offset,
      p_cluster_slug: clusterSlug || null,
    });
    if (error) throw new Error(error.message);
    return (data ?? []) as ScenarioSummary[];
  }
}

function normalizePerformanceIndicators(
  pis: ScenarioDetail["pis"] | string[] | undefined,
): ScenarioPerformanceIndicator[] {
  if (!pis?.length) return [];

  if (typeof pis[0] === "string") {
    return (pis as string[]).map((text, index) => ({
      pi_id: null,
      pi_code: null,
      indicator_text: text,
      display_order: index + 1,
    }));
  }

  return (pis as ScenarioPerformanceIndicator[]).map((pi, index) => ({
    pi_id: pi.pi_id ?? null,
    pi_code: pi.pi_code ?? null,
    indicator_text: pi.indicator_text,
    display_order: pi.display_order ?? index + 1,
  }));
}

export async function getScenario(id: string): Promise<ScenarioDetail | null> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("get_scenario", { p_id: id });
  if (error) throw new Error(error.message);
  if (!data) return null;

  const detail = data as ScenarioDetail & { pis?: ScenarioDetail["pis"] | string[] };
  return {
    ...detail,
    pis: normalizePerformanceIndicators(detail.pis),
    rubric: normalizeScenarioRubric(detail.rubric),
  };
}

const getCachedScenarioFilterOptions = unstable_cache(
  async () => {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("list_scenario_filter_options");
    if (error) throw new Error(error.message);
    return data as ScenarioFilterOptions;
  },
  ["scenario-filter-options"],
  { revalidate: 300 },
);

export async function getScenarioFilterOptions(): Promise<ScenarioFilterOptions> {
  await requireAuth();
  return getCachedScenarioFilterOptions();
}
