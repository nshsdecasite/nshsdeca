import { MAX_CENTURY_SCORE, MAX_PI_SCORE } from "@/lib/roleplay/scenarios";
import type { RubricScores } from "@/lib/roleplay/types";

export type RubricCriterionGroup =
  | "performance_indicator"
  | "solution"
  | "career_competencies"
  | "overall_impression"
  | "twenty_first_century_skills";

export type RubricLevelScale = {
  id?: string;
  level_name: string;
  min_points: number;
  max_points: number;
  level_order: number;
};

export type RubricCriterionScale = {
  id: string;
  display_order: number;
  criterion_group: RubricCriterionGroup;
  criterion_text: string;
  pi_id: string | null;
  pi_code: string | null;
  max_points: number;
  levels: RubricLevelScale[];
};

export type ScenarioRubric = {
  template_id: string;
  title: string | null;
  max_total_points: number | null;
  criteria: RubricCriterionScale[];
};

export const GROUP_LABELS: Record<RubricCriterionGroup, string> = {
  performance_indicator: "Performance indicators",
  solution: "Solution",
  career_competencies: "Career competencies",
  overall_impression: "Overall impression",
  twenty_first_century_skills: "21st Century Skills",
};

export const LEVEL_LABELS: Record<string, string> = {
  novice: "Novice",
  developing: "Developing",
  proficient: "Proficient",
  exemplary: "Exemplary",
};

const KNOWN_GROUPS = new Set<RubricCriterionGroup>([
  "performance_indicator",
  "solution",
  "career_competencies",
  "overall_impression",
  "twenty_first_century_skills",
]);

export function asInt(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? Math.trunc(n) : fallback;
}

function asGroup(value: unknown): RubricCriterionGroup {
  return KNOWN_GROUPS.has(value as RubricCriterionGroup)
    ? (value as RubricCriterionGroup)
    : "performance_indicator";
}

export function normalizeScenarioRubric(
  raw: ScenarioRubric | null | undefined,
): ScenarioRubric | undefined {
  if (!raw?.criteria?.length) return undefined;

  return {
    template_id: raw.template_id,
    title: raw.title ?? null,
    max_total_points:
      raw.max_total_points == null ? null : asInt(raw.max_total_points),
    criteria: raw.criteria.map((criterion, index) => ({
      id: criterion.id,
      display_order: asInt(criterion.display_order, index + 1),
      criterion_group: asGroup(criterion.criterion_group),
      criterion_text: criterion.criterion_text,
      pi_id: criterion.pi_id ?? null,
      pi_code: criterion.pi_code ?? null,
      max_points: asInt(criterion.max_points),
      levels: (criterion.levels ?? [])
        .map((level, levelIndex) => ({
          id: level.id,
          level_name: level.level_name,
          min_points: asInt(level.min_points),
          max_points: asInt(level.max_points),
          level_order: asInt(level.level_order, levelIndex + 1),
        }))
        .sort((a, b) => a.level_order - b.level_order),
    })),
  };
}

export function piCriteria(rubric?: ScenarioRubric | null) {
  return (
    rubric?.criteria.filter(
      (criterion) => criterion.criterion_group === "performance_indicator",
    ) ?? []
  );
}

export function extraCriteria(rubric?: ScenarioRubric | null) {
  return (
    rubric?.criteria.filter(
      (criterion) => criterion.criterion_group !== "performance_indicator",
    ) ?? []
  );
}

export function defaultNumericLevels(maxPoints = MAX_PI_SCORE): RubricLevelScale[] {
  const max = Math.max(4, maxPoints);
  const names = ["novice", "developing", "proficient", "exemplary"] as const;
  const levels: RubricLevelScale[] = [];
  let next = 0;
  for (let order = 1; order <= names.length; order += 1) {
    const high = order === names.length ? max : Math.round((max * order) / names.length);
    levels.push({
      level_name: names[order - 1],
      min_points: next,
      max_points: high,
      level_order: order,
    });
    next = high + 1;
  }
  return levels;
}

export function levelsForCriterion(
  criterion?: RubricCriterionScale | null,
  fallbackMax = MAX_PI_SCORE,
): RubricLevelScale[] {
  if (criterion?.levels?.length) {
    return [...criterion.levels].sort((a, b) => a.level_order - b.level_order);
  }
  return defaultNumericLevels(criterion?.max_points ?? fallbackMax);
}

export function pointsInLevel(level: RubricLevelScale): number[] {
  const start = Math.min(level.min_points, level.max_points);
  const end = Math.max(level.min_points, level.max_points);
  const points: number[] = [];
  for (let n = start; n <= end; n += 1) points.push(n);
  return points;
}

export function scoreToPointValue(score: number): string {
  return String(asInt(score));
}

export function criterionDisplayText(criterion: RubricCriterionScale | string) {
  const text = typeof criterion === "string" ? criterion : criterion.criterion_text;
  return text.replace(/\?+$/, "").trim();
}

export function splitCriterionLabel(text: string): { title: string | null; body: string } {
  const cleaned = criterionDisplayText(text);
  const match = cleaned.match(/^([^:]{1,40}):\s+(.+)$/);
  if (match) return { title: match[1], body: match[2] };
  return { title: null, body: cleaned };
}

export function clampScore(score: number, maxPoints: number) {
  return Math.min(Math.max(0, asInt(score)), Math.max(0, asInt(maxPoints)));
}

export function createEmptyRubric(
  piCount: number,
  template?: ScenarioRubric | null,
): RubricScores {
  const pis = piCriteria(template);
  const extras = extraCriteria(template);
  const count = pis.length || piCount;
  const piScores: Record<string, number> = {};
  for (let i = 1; i <= count; i += 1) {
    piScores[`PI-${i}`] = 0;
  }

  const extraScores = extras.length
    ? Object.fromEntries(extras.map((criterion) => [criterion.id, 0]))
    : undefined;

  return {
    piScores,
    centurySkills: 0,
    maxPiScore: pis[0]?.max_points ?? MAX_PI_SCORE,
    maxCenturyScore: extras.length
      ? extras.reduce((sum, criterion) => sum + criterion.max_points, 0)
      : MAX_CENTURY_SCORE,
    extraScores,
    maxTotalPoints: template?.max_total_points ?? undefined,
  };
}
