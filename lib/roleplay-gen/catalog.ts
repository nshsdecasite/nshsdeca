import eventsJson from "../../data/deca-kit/events.json";
import pflJson from "../../data/deca-kit/pfl_standards.json";
import pisJson from "../../data/deca-kit/performance_indicators.json";
import rubricsJson from "../../data/deca-kit/rubrics.json";
import type {
  CalculationsMode,
  Candidate,
  KitEvent,
  PflOutcome,
  RubricForm,
} from "@/lib/roleplay-gen/types";

type RawPi = {
  pool: string;
  code: string;
  text: string;
  display_text: string;
  level: string;
  instructional_area: string;
  instructional_area_code: string;
  performance_element: string;
};

type RawOutcome = {
  id: string;
  display_text: string;
  roleplay_suitable?: boolean;
};

type RawStandard = {
  topic: string;
  topic_numeral: string;
  grade: number;
  standard_id: string;
  uid: string;
  learning_outcomes: RawOutcome[];
};

const CLUSTER_NAMES: Record<string, string> = {
  BMA: "Business Management and Administration",
  FIN: "Finance",
  HT: "Hospitality and Tourism",
  MKT: "Marketing",
  ENT: "Entrepreneurship",
  PFL: "Personal Financial Literacy",
};

const PRINCIPLES_CLUSTER: Record<string, string> = {
  PBM: "Business Management and Administration",
  PEN: "Entrepreneurship",
  PFN: "Finance",
  PHT: "Hospitality and Tourism",
  PMK: "Marketing",
};

const events = (eventsJson as unknown as { events: KitEvent[] }).events;
const rawPis = (pisJson as unknown as { pis: RawPi[] }).pis;
const standards = (pflJson as unknown as { standards: RawStandard[] }).standards;
const rubrics = rubricsJson as unknown as {
  levels_of_evaluation: {
    levels: string[];
    focus_areas: Record<string, string[]>;
  };
  standard_5pi: RubricForm;
  principles_4pi: RubricForm;
  pfl_3pi: RubricForm;
};

let pisByPool: Map<string, RawPi[]> | null = null;

function poolIndex() {
  if (pisByPool) return pisByPool;
  pisByPool = new Map();
  for (const pi of rawPis) {
    const list = pisByPool.get(pi.pool) ?? [];
    list.push(pi);
    pisByPool.set(pi.pool, list);
  }
  return pisByPool;
}

function tierOf(pool: string) {
  if (pool.startsWith("T3")) return 3;
  if (pool.startsWith("T2")) return 2;
  if (pool.startsWith("T1")) return 1;
  return 0;
}

export function listEvents() {
  return events;
}

export function getEvent(code: string) {
  const event = events.find((item) => item.code === code);
  if (!event) throw new Error(`Unknown event ${code}.`);
  return event;
}

export function calculationsMode(event: KitEvent): CalculationsMode {
  if (event.judge_solution_page === true) return "always";
  if (typeof event.judge_solution_page === "string") return "optional";
  return "never";
}

export function clusterName(event: KitEvent) {
  if (event.category === "principles") {
    return PRINCIPLES_CLUSTER[event.code] ?? CLUSTER_NAMES[event.cluster] ?? event.cluster;
  }
  return CLUSTER_NAMES[event.cluster] ?? event.cluster;
}

export function rubricFor(event: KitEvent) {
  return rubrics[event.rubric];
}

export function levelsOfEvaluation() {
  return rubrics.levels_of_evaluation;
}

/** Deduped by code. When a code is in several pools, keep the most specific record and remember every pool. */
export function candidatesFor(pools: string[]): Candidate[] {
  const index = poolIndex();
  const best = new Map<string, Candidate>();
  for (const pool of pools) {
    for (const pi of index.get(pool) ?? []) {
      const tier = tierOf(pool);
      const existing = best.get(pi.code);
      if (!existing) {
        best.set(pi.code, {
          code: pi.code,
          text: pi.text,
          displayText: pi.display_text,
          level: pi.level,
          iaCode: pi.instructional_area_code,
          iaName: pi.instructional_area,
          performanceElement: pi.performance_element,
          pool,
          pools: [pool],
          tier,
        });
        continue;
      }
      if (!existing.pools.includes(pool)) existing.pools.push(pool);
      if (tier > existing.tier) {
        existing.tier = tier;
        existing.pool = pool;
        existing.text = pi.text;
        existing.displayText = pi.display_text;
        existing.level = pi.level;
        existing.iaCode = pi.instructional_area_code;
        existing.iaName = pi.instructional_area;
        existing.performanceElement = pi.performance_element;
      }
    }
  }
  return [...best.values()];
}

let pflCache: PflOutcome[] | null = null;

export function pflOutcomes() {
  if (pflCache) return pflCache;
  const outcomes: PflOutcome[] = [];
  for (const standard of standards) {
    if (standard.grade !== 8 && standard.grade !== 12) continue;
    for (const outcome of standard.learning_outcomes) {
      if (!outcome.roleplay_suitable) continue;
      outcomes.push({
        id: outcome.id,
        displayText: outcome.display_text,
        grade: standard.grade,
        topic: standard.topic,
        topicNumeral: standard.topic_numeral,
        standardUid: standard.uid,
        standardId: standard.standard_id,
      });
    }
  }
  pflCache = outcomes;
  return outcomes;
}
