import {
  calculationsMode,
  candidatesFor,
  getEvent,
  listEvents,
  pflOutcomes,
} from "@/lib/roleplay-gen/catalog";
import type { Candidate, GeneratorEvent, KitEvent, Selection } from "@/lib/roleplay-gen/types";

const CATEGORY_LABEL: Record<string, string> = {
  principles: "Principles",
  individual_series: "Individual series",
  team_decision_making: "Team decision making",
  personal_financial_literacy: "Personal financial literacy",
};

const SOFT_STARTS = [
  "operate register",
  "operate a register",
  "operate the register",
  "operate cash register",
  "pack and wrap",
  "accept checks",
  "write checks",
  "balance a bank account",
  "process retail telephone orders",
  "sell gift certificates",
  "maintain displays",
  "dismantle",
  "store displays",
  "proof ads",
  "obtain samples",
  "use basic operating systems",
  "create and post basic web page",
  "complete a job application",
  "prepare personal income tax forms",
  "write purchase orders",
  "file business tax returns",
];

const FLAVOR: Record<string, { heavy: string[]; light: string[] }> = {
  PMK: { heavy: ["CR", "CO", "EC", "MK", "EI"], light: ["FI", "BL", "HR", "SM", "EN"] },
  PFN: { heavy: ["FI", "EC", "BL"], light: ["CR", "OP", "MK", "HR", "SM", "EN"] },
  PHT: { heavy: ["CR", "EI", "CO", "OP"], light: ["FI", "BL", "MK", "HR", "SM", "EN"] },
  PBM: { heavy: ["OP", "HR", "NF", "SM", "CO"], light: ["CR", "FI", "MK", "EN"] },
  PEN: { heavy: ["EN", "EC", "BL", "FI"], light: ["CO", "NF", "PD", "MK", "HR", "SM"] },
};

const TYPICAL_ENT = new Set(["EN", "MP", "FI", "PM", "SM", "OP"]);
const SUPPORT_BONUS = new Set(["CO", "EI", "CR", "PD"]);

export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function weightedPick<T>(items: T[], weight: (item: T) => number, rnd: () => number): T {
  if (items.length === 0) throw new Error("Nothing to pick.");
  const weights = items.map((item) => Math.max(0, weight(item)));
  const total = weights.reduce((sum, value) => sum + value, 0);
  if (total <= 0) return items[Math.floor(rnd() * items.length)]!;
  let cursor = rnd() * total;
  for (let index = 0; index < items.length; index += 1) {
    cursor -= weights[index]!;
    if (cursor <= 0) return items[index]!;
  }
  return items[items.length - 1]!;
}

function softFiltered(text: string) {
  const lower = text.toLowerCase();
  if (SOFT_STARTS.some((prefix) => lower.startsWith(prefix))) return true;
  return /^demonstrate basic .+ applications\b/.test(lower);
}

function levelWeight(event: KitEvent, pi: Candidate) {
  const level = pi.level;
  if (event.category === "principles") {
    return ({ PQ: 0.35, CS: 0.45, SP: 0.2 } as Record<string, number>)[level] ?? 0;
  }
  if (event.code === "ENT") {
    return ({ CS: 0.15, SP: 0.25, SU: 0.1, MN: 0.3, ON: 0.2 } as Record<string, number>)[level] ?? 0;
  }
  if (event.code === "ETDM") {
    return ({ CS: 0.1, SP: 0.2, SU: 0.1, MN: 0.35, ON: 0.25 } as Record<string, number>)[level] ?? 0;
  }
  if (event.category === "team_decision_making") {
    return ({ PQ: 0.05, CS: 0.3, SP: 0.65 } as Record<string, number>)[level] ?? 0;
  }
  if (pi.tier <= 1) {
    return ({ PQ: 0.15, CS: 0.45, SP: 0.4 } as Record<string, number>)[level] ?? 0;
  }
  if (level === "MN" && event.code === "HRM") return 0.05;
  return ({ CS: 0.3, SP: 0.7 } as Record<string, number>)[level] ?? 0;
}

function eligible(event: KitEvent) {
  return candidatesFor(event.roleplay_pools).filter(
    (pi) => !softFiltered(pi.text) && levelWeight(event, pi) > 0,
  );
}

function groupByIa(pis: Candidate[]) {
  const groups = new Map<string, Candidate[]>();
  for (const pi of pis) {
    const list = groups.get(pi.iaCode) ?? [];
    list.push(pi);
    groups.set(pi.iaCode, list);
  }
  return groups;
}

function otherIaHas(all: Candidate[], iaCode: string, count: number) {
  for (const list of groupByIa(all.filter((pi) => pi.iaCode !== iaCode)).values()) {
    if (list.length >= count) return true;
  }
  return false;
}

function viable(event: KitEvent, iaCode: string, all: Candidate[]) {
  const primary = all.filter((pi) => pi.iaCode === iaCode);
  if (event.category === "principles") return primary.length >= event.pi_count;
  if (primary.length < 3) return false;
  if (event.code === "ENT" && !all.some((pi) => pi.level === "MN" || pi.level === "ON")) return false;

  const restAfterPrimary = (fromPrimary: number) => {
    const rest = event.pi_count - fromPrimary;
    if (rest <= 0) return true;
    return otherIaHas(all, iaCode, rest);
  };

  if (!event.pathway_pool) return restAfterPrimary(Math.min(primary.length, event.pi_count));

  const pathwayInside = primary.some((pi) => pi.pools.includes(event.pathway_pool!));
  if (pathwayInside) return restAfterPrimary(Math.min(primary.length, event.pi_count));

  const outside = all.filter(
    (pi) => pi.iaCode !== iaCode && pi.pools.includes(event.pathway_pool!),
  );
  for (const list of groupByIa(outside).values()) {
    const primaryExtra = primary.length - 3;
    const remaining = event.pi_count - 3;
    if (list.length >= 1 && primaryExtra + list.length >= remaining) return true;
  }
  return false;
}

function pickN(pool: Candidate[], count: number, rnd: () => number, event: KitEvent) {
  const chosen: Candidate[] = [];
  let remaining = [...pool];
  while (chosen.length < count && remaining.length > 0) {
    const item = weightedPick(remaining, (pi) => {
      let weight = levelWeight(event, pi);
      if (chosen.some((picked) => picked.performanceElement === pi.performanceElement)) weight *= 2.5;
      return weight;
    }, rnd);
    chosen.push(item);
    remaining = remaining.filter((pi) => pi.code !== item.code);
  }
  return chosen;
}

function depth(text: string) {
  const normalized = text.toLowerCase();
  if (/^(explain|identify|describe|define|discuss|distinguish)\b/.test(normalized)) return 0;
  if (/^(develop|create|design|place|use|implement|recommend|prepare|write|plan)\b/.test(normalized)) return 2;
  return 1;
}

function order(chosen: Candidate[], primaryCode: string) {
  return [...chosen].sort((a, b) => {
    const area = Number(a.iaCode !== primaryCode) - Number(b.iaCode !== primaryCode);
    return area || depth(a.text) - depth(b.text) || a.code.localeCompare(b.code);
  });
}

function toSelection(event: KitEvent, primary: { code: string; name: string }, chosen: Candidate[], seed: number): Selection {
  return {
    eventCode: event.code,
    primaryIA: primary,
    pis: chosen.map((pi) => ({
      code: pi.code,
      display_text: pi.displayText,
      level: pi.level,
      pool: pi.pool,
      ia: pi.iaName,
      iaCode: pi.iaCode,
      performance_element: pi.performanceElement,
    })),
    seed,
  };
}

function assertComposition(event: KitEvent, primaryCode: string, chosen: Candidate[]) {
  if (chosen.length !== event.pi_count) {
    throw new Error(`${event.code} needs ${event.pi_count} indicators.`);
  }
  if (new Set(chosen.map((pi) => pi.code)).size !== chosen.length) {
    throw new Error("Duplicate indicators were selected.");
  }
  const support = new Set(chosen.filter((pi) => pi.iaCode !== primaryCode).map((pi) => pi.iaCode));
  if (support.size > 1) throw new Error("A scenario can only use one supporting instructional area.");
  if (event.category === "principles") {
    if (chosen.some((pi) => pi.iaCode !== primaryCode || !pi.pools.includes("T1:CORE"))) {
      throw new Error("Principles indicators must all come from one Tier 1 area.");
    }
    return;
  }
  if (chosen.filter((pi) => pi.iaCode === primaryCode).length < 3) {
    throw new Error("At least three indicators must come from the primary instructional area.");
  }
  if (event.pathway_pool && !chosen.some((pi) => pi.pools.includes(event.pathway_pool!))) {
    throw new Error(`${event.code} needs an indicator from its pathway.`);
  }
  if (event.category === "team_decision_making" && event.code !== "ETDM") {
    if (chosen.some((pi) => pi.pools.every((pool) => pool.startsWith("T3")))) {
      throw new Error("Team events cannot use Tier 3 indicators.");
    }
  }
  if (event.code === "ENT" && !chosen.some((pi) => pi.level === "MN" || pi.level === "ON")) {
    throw new Error("Entrepreneurship events need a manager or owner indicator.");
  }
}

function supportingPool(all: Candidate[], chosen: Candidate[], primaryCode: string, need: number, rnd: () => number) {
  const used = new Set(chosen.map((pi) => pi.code));
  const groups = [...groupByIa(all.filter((pi) => pi.iaCode !== primaryCode && !used.has(pi.code))).entries()];
  const enough = groups.filter(([, list]) => list.length >= need);
  const source = enough.length > 0 ? enough : groups;
  if (source.length === 0) return [];
  return weightedPick(source, ([code, list]) => list.length * (SUPPORT_BONUS.has(code) ? 4 : 1), rnd)[1];
}

function selectBusiness(event: KitEvent, requested: string | undefined, seed: number): Selection {
  const rnd = mulberry32(seed);
  const all = eligible(event);
  const options = [...groupByIa(all).entries()].filter(([code]) => viable(event, code, all));
  if (options.length === 0) throw new Error(`${event.code} has no instructional area that can fill a scenario.`);

  let primaryCode = requested?.trim() || "";
  if (primaryCode) {
    if (!options.some(([code]) => code === primaryCode)) {
      const name = all.find((pi) => pi.iaCode === primaryCode)?.iaName ?? primaryCode;
      throw new Error(`${name} cannot fill a ${event.code} scenario. Choose another instructional area.`);
    }
  } else {
    const picked = weightedPick(options, ([code, list]) => {
      let weight = list.length;
      if (event.category === "principles") {
        const flavor = FLAVOR[event.code];
        if (flavor?.heavy.includes(code)) weight *= 2;
        else if (flavor?.light.includes(code)) weight *= 0.5;
      }
      if (event.pathway_pool && list.some((pi) => pi.pools.includes(event.pathway_pool!))) weight *= 2;
      if ((event.code === "ENT" || event.code === "ETDM") && TYPICAL_ENT.has(code)) weight *= 2;
      return weight;
    }, rnd);
    primaryCode = picked[0];
  }

  const primary = {
    code: primaryCode,
    name: all.find((pi) => pi.iaCode === primaryCode)!.iaName,
  };
  const primaryPool = all.filter((pi) => pi.iaCode === primary.code);
  const chosen: Candidate[] = [];
  const used = () => new Set(chosen.map((pi) => pi.code));

  const addFrom = (pool: Candidate[], count: number) => {
    const picked = pickN(pool.filter((pi) => !used().has(pi.code)), count, rnd, event);
    chosen.push(...picked);
    return picked.length;
  };

  if (event.category === "principles") {
    addFrom(primaryPool, event.pi_count);
  } else {
    if (event.pathway_pool) {
      const inPrimary = primaryPool.filter((pi) => pi.pools.includes(event.pathway_pool!));
      if (inPrimary.length > 0) {
        addFrom(inPrimary, 1);
      } else {
        const outside = all.filter((pi) => pi.iaCode !== primary.code && pi.pools.includes(event.pathway_pool!));
        const grouped = [...groupByIa(outside).entries()].filter(([, list]) => {
          const primaryExtra = primaryPool.length - 3;
          return list.length >= 1 && primaryExtra + list.length >= event.pi_count - 3;
        });
        if (grouped.length === 0) throw new Error(`${event.code} has no pathway indicator that fits ${primary.name}.`);
        const list = weightedPick(grouped, ([, items]) => items.length, rnd)[1];
        addFrom(list.filter((pi) => pi.pools.includes(event.pathway_pool!)), 1);
      }
    }

    if (event.code === "ENT" && !chosen.some((pi) => pi.level === "MN" || pi.level === "ON")) {
      const anchors = all.filter((pi) => (pi.level === "MN" || pi.level === "ON") && !used().has(pi.code));
      const inPrimary = anchors.filter((pi) => pi.iaCode === primary.code);
      const supportIa = chosen.find((pi) => pi.iaCode !== primary.code)?.iaCode;
      const matchingSupport = supportIa ? anchors.filter((pi) => pi.iaCode === supportIa) : [];
      const source = inPrimary.length > 0 ? inPrimary : matchingSupport.length > 0 ? matchingSupport : supportIa ? [] : anchors;
      if (source.length === 0) throw new Error("No manager or owner indicator fits this entrepreneurship scenario.");
      addFrom(source, 1);
    }

    let guard = 0;
    while (chosen.filter((pi) => pi.iaCode === primary.code).length < 3) {
      if (addFrom(primaryPool, 1) === 0 || ++guard > 6) {
        throw new Error(`${primary.name} does not have three usable indicators.`);
      }
    }

    guard = 0;
    while (chosen.length < event.pi_count) {
      if (++guard > 8) throw new Error(`Could not fill ${event.pi_count} indicators for ${event.code}.`);
      const before = chosen.length;
      const supportCodes = [...new Set(chosen.filter((pi) => pi.iaCode !== primary.code).map((pi) => pi.iaCode))];
      const need = event.pi_count - chosen.length;
      const primaryLeft = primaryPool.filter((pi) => !used().has(pi.code));

      if (supportCodes.length > 1) throw new Error("A scenario can only use one supporting instructional area.");

      if (supportCodes.length === 1) {
        const more = all.filter((pi) => pi.iaCode === supportCodes[0] && !used().has(pi.code));
        if (more.length > 0) addFrom(more, Math.min(need, more.length));
        else if (primaryLeft.length > 0) addFrom(primaryLeft, Math.min(need, primaryLeft.length));
      } else if (chosen.filter((pi) => pi.iaCode === primary.code).length >= 3) {
        const support = supportingPool(all, chosen, primary.code, need, rnd);
        if (support.length >= need || primaryLeft.length < need) {
          if (support.length > 0) addFrom(support, Math.min(need, support.length));
          else if (primaryLeft.length > 0) addFrom(primaryLeft, Math.min(need, primaryLeft.length));
        } else if (primaryLeft.length > 0) {
          addFrom(primaryLeft, 1);
        }
      } else if (primaryLeft.length > 0) {
        addFrom(primaryLeft, 1);
      }

      if (chosen.length === before) {
        throw new Error(`Could not fill ${event.pi_count} indicators for ${event.code}.`);
      }
    }
  }

  const ordered = order(chosen, primary.code);
  assertComposition(event, primary.code, ordered);
  return toSelection(event, primary, ordered, seed);
}

function selectPfl(event: KitEvent, requested: string | undefined, seed: number): Selection {
  const rnd = mulberry32(seed);
  const outcomes = pflOutcomes();
  const topics = [...groupTopics(outcomes).entries()].filter(([, list]) => list.length >= 3);
  if (topics.length === 0) throw new Error("No personal finance topic has three role-play outcomes.");

  const requestedTopic = requested?.trim();
  const topic = requestedTopic
    ? topics.find(([name]) => name === requestedTopic)
    : weightedPick(topics, ([, list]) => list.length, rnd);
  if (!topic) throw new Error("Choose a personal finance topic with at least three outcomes.");

  const [topicName, inTopic] = topic;
  const standards = [...groupStandards(inTopic).entries()];
  const first = weightedPick(standards, ([, list]) => list.length, rnd);
  const picked = takeOutcomes(first[1], Math.min(3, first[1].length), rnd);
  if (picked.length < 3) {
    const rest = standards.filter(([uid]) => uid !== first[0]);
    if (rest.length === 0) throw new Error(`${topicName} does not have three related outcomes.`);
    const second = weightedPick(rest, ([, list]) => list.length, rnd);
    picked.push(...takeOutcomes(second[1], 3 - picked.length, rnd));
  }
  if (picked.length < 3) throw new Error(`${topicName} does not have three related outcomes.`);

  const selected = picked.slice(0, 3);
  const standardsUsed = new Set(selected.map((outcome) => outcome.standardUid));
  if (standardsUsed.size > 2) throw new Error("Personal finance scenarios stay within two standards.");

  return {
    eventCode: event.code,
    primaryIA: { code: selected[0]!.topicNumeral, name: topicName },
    pis: selected.map((outcome) => ({
      code: outcome.id,
      display_text: outcome.displayText,
      level: `G${outcome.grade}`,
      pool: "PFL",
      ia: topicName,
      iaCode: outcome.topicNumeral,
      performance_element: outcome.standardUid,
    })),
    pfl: {
      topic: topicName,
      outcomes: selected.map((outcome) => ({ id: outcome.id, display_text: outcome.displayText })),
    },
    seed,
  };
}

function groupTopics<T extends { topic: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const list = groups.get(item.topic) ?? [];
    list.push(item);
    groups.set(item.topic, list);
  }
  return groups;
}

function groupStandards<T extends { standardUid: string }>(items: T[]) {
  const groups = new Map<string, T[]>();
  for (const item of items) {
    const list = groups.get(item.standardUid) ?? [];
    list.push(item);
    groups.set(item.standardUid, list);
  }
  return groups;
}

function takeOutcomes<T>(items: T[], count: number, rnd: () => number) {
  const pool = [...items];
  const picked: T[] = [];
  while (picked.length < count && pool.length > 0) {
    const index = Math.floor(rnd() * pool.length);
    picked.push(pool.splice(index, 1)[0]!);
  }
  return picked;
}

export function listInstructionalAreas(eventCode: string) {
  const event = getEvent(eventCode);
  if (!event.generate_roleplay) return [];
  if (event.category === "personal_financial_literacy") {
    return [...groupTopics(pflOutcomes()).entries()]
      .filter(([, list]) => list.length >= 3)
      .map(([topic]) => ({ code: topic, name: topic }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }
  const all = eligible(event);
  return [...groupByIa(all).entries()]
    .filter(([code]) => viable(event, code, all))
    .map(([code, list]) => ({ code, name: list[0]!.iaName }))
    .sort((a, b) => a.name.localeCompare(b.name));
}

export function listGeneratorEvents(): GeneratorEvent[] {
  return listEvents()
    .filter((event) => event.generate_roleplay)
    .map((event) => ({
      code: event.code,
      name: event.name,
      category: CATEGORY_LABEL[event.category] ?? event.category,
      pathway: event.pathway,
      piCount: event.pi_count,
      prepMinutes: event.prep_minutes,
      presentMinutes: event.present_minutes,
      areas: listInstructionalAreas(event.code),
      calculations: calculationsMode(event),
    }));
}

export function selectPIs(request: { eventCode: string; primaryIA?: string; seed?: number }): Selection {
  const event = getEvent(request.eventCode);
  if (!event.generate_roleplay) {
    throw new Error(`${event.code} is exam-only and does not get a role-play.`);
  }
  const seed = request.seed ?? Math.floor(Math.random() * 0xffffffff);
  if (event.category === "personal_financial_literacy") return selectPfl(event, request.primaryIA, seed);
  return selectBusiness(event, request.primaryIA, seed);
}
