"use server";

import { requireAuth } from "@/lib/auth/roles";
import type {
  ScenarioDetail,
  ScenarioPerformanceIndicator,
  ScenarioFilterOptions,
  ScenarioSummary,
} from "@/lib/roleplay/scenario-types";
import { createClient } from "@/lib/supabase/server";

async function getSupabase() {
  return createClient();
}

function optionalText(value: string | undefined) {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

export async function listScenarios(input?: {
  eventCode?: string;
  year?: number;
  level?: string;
  search?: string;
  limit?: number;
  offset?: number;
}): Promise<ScenarioSummary[]> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("list_scenarios", {
    p_event_code: optionalText(input?.eventCode) ?? null,
    p_year: input?.year ?? null,
    p_level: optionalText(input?.level) ?? null,
    p_search: optionalText(input?.search) ?? null,
    p_limit: input?.limit ?? 24,
    p_offset: input?.offset ?? 0,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as ScenarioSummary[];
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
  };
}

export async function getScenarioFilterOptions(): Promise<ScenarioFilterOptions> {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("list_scenario_filter_options");
  if (error) throw new Error(error.message);
  return data as ScenarioFilterOptions;
}
