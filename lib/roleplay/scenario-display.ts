import type {
  ScenarioDetail,
  ScenarioPerformanceIndicator,
} from "@/lib/roleplay/scenario-types";
import type { Scenario } from "@/lib/roleplay/types";

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

export function scenarioDetailToLegacy(detail: ScenarioDetail): Scenario {
  const title =
    detail.scenario_title?.trim() ||
    `${detail.event_code} scenario ${detail.scenario_number}`;

  const performanceIndicators = normalizePerformanceIndicators(detail.pis);

  return {
    id: detail.id,
    title,
    description: detail.situation_description ?? "",
    event: detail.event_name,
    pis: performanceIndicators.map((pi) => pi.indicator_text),
    performanceIndicators,
  };
}

export function submissionScenarioId(submission: {
  scenario_id?: string | null;
  scenario_key: string;
}) {
  return submission.scenario_id ?? submission.scenario_key;
}

export function submissionScenarioTitle(submission: {
  scenario_title?: string | null;
  scenario_key: string;
}) {
  return submission.scenario_title ?? submission.scenario_key;
}
