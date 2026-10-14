"use server";

import { revalidatePath, unstable_cache } from "next/cache";
import { requireAuth, requireRole } from "@/lib/auth/roles";
import type {
  PracticeReviewQueueItem,
  ScenarioDetail,
  ScenarioPerformanceIndicator,
  ScenarioFilterOptions,
  ScenarioSummary,
} from "@/lib/roleplay/scenario-types";
import { extractJudgeQuestions } from "@/lib/roleplay/judge-questions";
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
  { revalidate: 60, tags: ["scenario-catalog"] },
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

  const params = {
    p_event_code: eventCode || null,
    p_year: year > 0 ? year : null,
    p_search: search || null,
    p_limit: limit,
    p_offset: offset,
    p_cluster_slug: clusterSlug || null,
  };

  try {
    const official =
      level === "practice"
        ? []
        : (await loadScenarioCatalog(
            eventCode,
            year,
            level,
            search,
            clusterSlug,
            limit,
            offset,
          )).filter((scenario) => scenario.level !== "practice");

    if (level && level !== "practice") return official;

    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc("list_scenarios", {
      ...params,
      p_level: "practice",
    });
    if (error) throw new Error(error.message);
    const practice = (data ?? []) as ScenarioSummary[];
    if (level === "practice") return practice;
    return [...official, ...practice];
  } catch {
    const supabase = await getSupabase();
    const { data, error } = await supabase.rpc("list_scenarios", {
      ...params,
      p_level: level || null,
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

  const detail = data as ScenarioDetail & {
    pis?: ScenarioDetail["pis"] | string[];
    judge_question_1?: string | null;
    judge_question_2?: string | null;
  };
  const stored = [detail.judge_question_1, detail.judge_question_2]
    .map((question) => question?.trim() ?? "")
    .filter(Boolean);
  return {
    ...detail,
    pis: normalizePerformanceIndicators(detail.pis),
    rubric: normalizeScenarioRubric(detail.rubric),
    judge_questions: stored.length
      ? stored.slice(0, 2)
      : extractJudgeQuestions(detail.judge_characterization),
  };
}

export async function listScenarioAnswers(scenarioId: string) {
  await requireAuth();
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("list_scenario_answers", {
    p_scenario_id: scenarioId,
  });
  if (error) throw new Error(error.message);
  return (data ?? []) as { question_number: number; answer_text: string }[];
}

export async function saveScenarioAnswer(
  scenarioId: string,
  questionNumber: number,
  answer: string,
) {
  await requireAuth();
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("save_scenario_answer", {
    p_scenario_id: scenarioId,
    p_question_number: questionNumber,
    p_answer: answer,
  });
  if (error) throw new Error(error.message);
}

const getCachedScenarioFilterOptions = unstable_cache(
  async () => {
    const admin = createAdminClient();
    const { data, error } = await admin.rpc("list_scenario_filter_options");
    if (error) throw new Error(error.message);
    return data as ScenarioFilterOptions;
  },
  ["scenario-filter-options-v2"],
  { revalidate: 300, tags: ["scenario-filters"] },
);

export async function getScenarioFilterOptions(): Promise<ScenarioFilterOptions> {
  await requireAuth();
  return getCachedScenarioFilterOptions();
}

export async function submitPracticeScenarioForReview(scenarioId: string) {
  await requireAuth();
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("submit_practice_scenario_for_review", {
    p_id: scenarioId,
  });
  if (error) throw new Error(error.message);
  revalidatePracticeReview(scenarioId);
}

export async function withdrawPracticeScenarioReview(scenarioId: string) {
  await requireAuth();
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("withdraw_practice_scenario_review", {
    p_id: scenarioId,
  });
  if (error) throw new Error(error.message);
  revalidatePracticeReview(scenarioId);
}

export async function listPracticeReviewQueue(): Promise<PracticeReviewQueueItem[]> {
  await requireRole(["officer", "advisor"], "/admin/generated");
  const supabase = await getSupabase();
  const { data, error } = await supabase.rpc("list_practice_review_queue");
  if (error) throw new Error(error.message);
  return (data ?? []) as PracticeReviewQueueItem[];
}

function revalidatePracticeReview(scenarioId: string) {
  revalidatePath(`/roleplays/${scenarioId}`);
  revalidatePath("/roleplays");
  revalidatePath("/admin/generated");
}

export async function approvePracticeScenario(scenarioId: string) {
  await requireRole(["officer", "advisor"], "/admin/generated");
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("approve_practice_scenario", {
    p_id: scenarioId,
  });
  if (error) throw new Error(error.message);
  revalidatePracticeReview(scenarioId);
}

export async function rejectPracticeScenario(scenarioId: string) {
  await requireRole(["officer", "advisor"], "/admin/generated");
  const supabase = await getSupabase();
  const { error } = await supabase.rpc("reject_practice_scenario", {
    p_id: scenarioId,
  });
  if (error) throw new Error(error.message);
  revalidatePracticeReview(scenarioId);
}
