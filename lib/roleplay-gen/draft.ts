import type { BodyBlock, Calculation, JudgeSolution, ScenarioDraft } from "@/lib/roleplay-gen/types";

const NOUNS = new Set(["ideas", "plan", "recommendation", "information"]);
const PREPOSITIONS = new Set(["at", "for", "of", "with"]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function text(value: unknown) {
  return typeof value === "string" ? value.trim() : "";
}

function parseHooks(value: unknown) {
  const hooks: Record<string, string> = {};
  const remember = (code: string, hook: string) => {
    const cleanCode = code.trim();
    const cleanHook = hook.trim();
    if (cleanCode && cleanHook) hooks[cleanCode] = cleanHook;
  };

  if (Array.isArray(value)) {
    for (const entry of value) {
      if (typeof entry === "string") {
        const match = entry.match(/^([A-Za-z]{1,4}:\d+|[IVXLC]+\.\d+-\d+[a-z]?)\s*:\s*(.+)$/);
        if (match) remember(match[1]!, match[2]!);
      } else if (isRecord(entry)) {
        remember(text(entry.code), text(entry.hook ?? entry.text ?? entry.sentence));
      }
    }
    return hooks;
  }

  if (isRecord(value)) {
    for (const [code, hook] of Object.entries(value)) {
      if (typeof hook === "string") remember(code, hook);
    }
  }
  return hooks;
}

export function parseModelJson(raw: string): unknown {
  const trimmed = raw.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "").trim();
  return JSON.parse(trimmed) as unknown;
}

function blockList(value: unknown): unknown[] | null {
  if (typeof value === "string" && value.trim()) return [{ type: "p", text: value.trim() }];
  if (Array.isArray(value)) {
    if (value.every((entry) => typeof entry === "string")) {
      return value.filter((entry) => entry.trim()).map((entry) => ({ type: "p", text: entry.trim() }));
    }
    return value;
  }
  if (!isRecord(value)) return null;
  if (value.type === "p" || value.type === "bullets") return [value];
  for (const key of ["blocks", "paragraphs", "content"]) {
    if (Array.isArray(value[key])) return blockList(value[key]);
  }
  return null;
}

function parseBlocks(value: unknown, label: string, errors: string[]): BodyBlock[] {
  const blocksIn = blockList(value);
  if (!blocksIn || blocksIn.length === 0) {
    errors.push(`${label} must be a non-empty list of paragraphs or bullet lists.`);
    return [];
  }
  const blocks: BodyBlock[] = [];
  for (const item of blocksIn) {
    if (!isRecord(item)) {
      errors.push(`${label} has a block that is not an object.`);
      continue;
    }
    if (item.type === "p") {
      const paragraph = text(item.text);
      if (!paragraph) errors.push(`${label} has an empty paragraph.`);
      else blocks.push({ type: "p", text: paragraph });
    } else if (item.type === "bullets") {
      const items = Array.isArray(item.items)
        ? item.items.filter((entry): entry is string => typeof entry === "string" && entry.trim().length > 0).map((entry) => entry.trim())
        : [];
      if (items.length === 0) errors.push(`${label} has a bullet list with no items.`);
      else blocks.push({ type: "bullets", items });
    } else {
      errors.push(`${label} blocks must use type "p" or "bullets".`);
    }
  }
  return blocks;
}

function parseCalculations(value: unknown): Calculation[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) => {
    if (!isRecord(item)) return [];
    const result = typeof item.result === "number" ? item.result : Number(item.result);
    if (!text(item.label) || !text(item.formula) || !text(item.expression) || !Number.isFinite(result)) return [];
    return [{
      label: text(item.label),
      formula: text(item.formula),
      expression: text(item.expression),
      result,
      unit: text(item.unit),
    }];
  });
}

function parseSolution(value: unknown): JudgeSolution | null {
  if (!isRecord(value)) return null;
  const concept = isRecord(value.concept) ? value.concept : null;
  const intro = text(concept?.intro ?? value.concept_intro);
  const bullets = concept?.bullets ?? value.concept_bullets;
  const steps = value.steps;
  const conclusion = text(value.model_conclusion ?? value.modelConclusion);
  if (!intro || !Array.isArray(bullets) || bullets.some((item) => typeof item !== "string" || !item.trim())) return null;
  if (!Array.isArray(steps) || steps.length === 0 || steps.some((item) => typeof item !== "string" || !item.trim())) return null;
  if (!conclusion) return null;
  return {
    conceptIntro: intro,
    conceptBullets: (bullets as string[]).map((item) => item.trim()),
    steps: (steps as string[]).map((item) => item.trim()),
    modelConclusion: conclusion,
  };
}

export function parseDraft(raw: unknown): { draft: ScenarioDraft } | { errors: string[] } {
  if (!isRecord(raw)) return { errors: ["The model did not return a JSON object."] };

  const notes = isRecord(raw.internal_notes) ? raw.internal_notes : {};
  const hooks = parseHooks(notes.pi_hooks);
  const outline = Array.isArray(notes.strong_answer_outline)
    ? notes.strong_answer_outline.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : [];

  const questions = Array.isArray(raw.judge_questions)
    ? raw.judge_questions.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : typeof raw.judge_questions === "string" && raw.judge_questions.trim()
      ? [raw.judge_questions.trim()]
      : [];
  while (questions.length < 2) questions.push("");

  const noun = text(raw.presentation_noun);
  const thanks = text(raw.thanks_for);
  const meeting = text(raw.meeting_word);
  const prepositionRaw = raw.preposition == null || raw.preposition === "" ? null : text(raw.preposition);
  const preposition = prepositionRaw && PREPOSITIONS.has(prepositionRaw) ? prepositionRaw : prepositionRaw ? "at" : null;
  const locationRaw = text(raw.closing_location);
  const location = locationRaw === "judge_office" || locationRaw === "participant_office" || locationRaw.startsWith("on_site:")
    ? locationRaw
    : "judge_office";
  const openingRaw = text(raw.judge_opening);
  const opening = openingRaw === "hear_ideas" || openingRaw === "hear_information" || openingRaw.startsWith("ask_about:")
    ? openingRaw
    : "hear_ideas";

  const roles = Array.isArray(raw.participant_roles)
    ? raw.participant_roles.filter((item): item is string => typeof item === "string" && item.trim().length > 0).map((item) => item.trim())
    : null;

  const situationErrors: string[] = [];
  let situation = parseBlocks(raw.situation_body, "situation_body", situationErrors);
  if (situation.length === 0) {
    const seed = text(raw.core_task) || text(raw.participant_role) || "A practical decision is needed from the facts at hand.";
    situation = [{ type: "p", text: seed }];
  }
  const judgeErrors: string[] = [];
  let judgeBody = parseBlocks(raw.judge_body, "judge_body", judgeErrors);
  if (judgeBody.length === 0) {
    judgeBody = situation.map((block) =>
      block.type === "p" ? { type: "p" as const, text: block.text } : { type: "bullets" as const, items: [...block.items] },
    );
  }

  const draft: ScenarioDraft = {
    participant_role: text(raw.participant_role) || "assistant",
    participant_roles: roles && roles.length > 0 ? roles : null,
    preposition: (preposition as ScenarioDraft["preposition"]) ?? null,
    company_name: text(raw.company_name) ? text(raw.company_name).toUpperCase() : null,
    company_descriptor: text(raw.company_descriptor) || null,
    judge_ref: text(raw.judge_ref).replace(/\s*\(judge\)/gi, "").replace(/\s+/g, " ").trim() || "the supervisor",
    core_task: text(raw.core_task).replace(/^wants you to\s+/i, "") || "recommend a practical next step",
    situation_body: situation,
    judge_body: judgeBody,
    presentation_noun: (NOUNS.has(noun) ? noun : "plan") as ScenarioDraft["presentation_noun"],
    closing_location: location,
    judge_opening: opening,
    thanks_for: thanks === "information" ? "information" : "work",
    meeting_word: meeting === "role-play" ? "role-play" : "meeting",
    judge_questions: [questions[0] ?? "", questions[1] ?? ""],
    internal_notes: {
      pi_hooks: hooks,
      strong_answer_outline: outline,
      calculations: parseCalculations(notes.calculations),
    },
    judge_solution: parseSolution(raw.judge_solution),
  };
  return { draft: normalizeDraft(draft) };
}

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function replaceCompany(value: string, company: string) {
  const pattern = new RegExp(`(?<![A-Za-z])${escapeRegExp(company)}(?![A-Za-z])`, "gi");
  return value.replace(pattern, company);
}

const ONLY_LABEL = /^(?:facts|problem(?:\s*(?:\/|or)\s*change)?|problems?|changes?|deliverables?|the ask|situation|background|task|scenario|context|challenge|objectives?|requirements?|overview|summary)\s*:?\s*$/i;

function stripSectionLabels(value: string) {
  return value
    .replace(/(?:^|(?<=[.!?]\s))(?:facts|problem(?:\s*(?:\/|or)\s*change)?|problems?|changes?|deliverables?|the ask|situation|background|task|scenario|context|challenge|objectives?|requirements?|overview|summary)\s*:\s*/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function asSecondPerson(value: string) {
  return value
    .replace(/\bthe participant's\b/gi, "your")
    .replace(/\b[Tt]he participant is\b/g, (match) => (match.startsWith("T") ? "You are" : "you are"))
    .replace(/\b[Tt]he participant has\b/g, (match) => (match.startsWith("T") ? "You have" : "you have"))
    .replace(/\b[Tt]he participant was\b/g, (match) => (match.startsWith("T") ? "You were" : "you were"))
    .replace(/\b[Tt]he participant team\b/g, (match) => (match.startsWith("T") ? "You" : "you"))
    .replace(/\b[Tt]he participant\b/g, (match) => (match.startsWith("T") ? "You" : "you"));
}

function polishBlocks(blocks: BodyBlock[], edit: (value: string) => string): BodyBlock[] {
  const next: BodyBlock[] = [];
  for (const block of blocks) {
    if (block.type === "p") {
      const text = edit(block.text);
      if (!text || ONLY_LABEL.test(text)) continue;
      if (/^you are to assume the roles?\b/i.test(text)) continue;
      if (/^you will (?:give|share|present)\b/i.test(text) && /\(judge\)/i.test(text)) continue;
      next.push({ type: "p", text });
      continue;
    }
    const items = block.items.map(edit).filter((item) => item && !ONLY_LABEL.test(item));
    if (items.length > 0) next.push({ type: "bullets", items });
  }
  return next.length > 0 ? next : blocks;
}

function tagJudge(value: string, judgeRef: string) {
  const escaped = escapeRegExp(judgeRef);
  const possessive = new RegExp(`(?<![A-Za-z])${escaped}'s(?!\\s*\\(judge's\\))`, "gi");
  const tagged = value.replace(possessive, `${judgeRef}'s (judge's)`);
  const plain = new RegExp(`(?<![A-Za-z])${escaped}(?!'s)(?!\\s*\\(judge\\))(?![A-Za-z])`, "gi");
  return tagged.replace(plain, `${judgeRef} (judge)`);
}

/** Judge bullet lists are the situation lists, in the same order. The model often rewrites them. */
function copySituationBullets(situation: BodyBlock[], judge: BodyBlock[]): BodyBlock[] {
  const sources = situation.flatMap((block) => (block.type === "bullets" ? [block.items] : []));
  let cursor = 0;
  const next: BodyBlock[] = [];
  for (const block of judge) {
    if (block.type !== "bullets") {
      next.push(block);
      continue;
    }
    if (cursor >= sources.length) continue;
    next.push({ type: "bullets", items: [...sources[cursor]!] });
    cursor += 1;
  }
  while (cursor < sources.length) {
    next.push({ type: "bullets", items: [...sources[cursor]!] });
    cursor += 1;
  }
  return next.length > 0 ? next : judge;
}

function roundResult(value: number) {
  const places = Math.abs(value) >= 1 ? 2 : 4;
  const factor = 10 ** places;
  return Math.round(value * factor) / factor;
}

function formatResult(value: number) {
  if (Math.abs(value) >= 1000) {
    return value.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return String(value);
}

function resultShown(text: string, result: number) {
  const tokens = text.match(/\d[\d,]*(?:\.\d+)?%?/g) ?? [];
  const tolerance = Math.abs(result) >= 1 ? Math.max(0.05, Math.abs(result) * 0.0001) : 0.0001;
  return tokens.some((token) => {
    const percent = token.endsWith("%");
    const value = Number(token.replace(/,/g, "").replace("%", ""));
    if (!Number.isFinite(value)) return false;
    const candidate = percent ? value / 100 : value;
    return Math.abs(candidate - result) <= tolerance;
  });
}

function workedLine(calculation: Calculation) {
  const unit = calculation.unit ? ` ${calculation.unit}` : "";
  return `${calculation.label}: ${calculation.formula} = ${formatResult(calculation.result)}${unit}.`;
}

/** Round calculator dust and fill a judge solution from the worked expressions. */
export function prepareCalculationDraft(draft: ScenarioDraft): ScenarioDraft {
  const calculations = draft.internal_notes.calculations.map((calculation) => ({
    ...calculation,
    result: roundResult(calculation.result),
  }));
  if (calculations.length === 0) return draft;

  const existing = draft.judge_solution;
  const steps = [...(existing?.steps ?? [])];
  for (const calculation of calculations) {
    if (!resultShown(steps.join("\n"), calculation.result)) steps.push(workedLine(calculation));
  }

  const summary = calculations
    .map((calculation) => {
      const unit = calculation.unit ? ` ${calculation.unit}` : "";
      return `${calculation.label} is ${formatResult(calculation.result)}${unit}`;
    })
    .join(", ");

  return {
    ...draft,
    internal_notes: { ...draft.internal_notes, calculations },
    judge_solution: {
      conceptIntro: existing?.conceptIntro || "These measures use only the figures in the situation.",
      conceptBullets: existing?.conceptBullets?.length
        ? existing.conceptBullets
        : calculations.map((calculation) => `${calculation.label}: ${calculation.formula}.`),
      steps,
      modelConclusion: existing?.modelConclusion || `${summary}.`,
    },
  };
}

export function normalizeDraft(draft: ScenarioDraft): ScenarioDraft {
  const company = draft.company_name?.toUpperCase() ?? null;
  const polish = (value: string) => (company ? replaceCompany(value, company) : value);
  const participant = (value: string) => tagJudge(polish(value), draft.judge_ref);

  const situationBody = polishBlocks(draft.situation_body, (value) => participant(asSecondPerson(stripSectionLabels(value))));
  const judgeBody = polishBlocks(draft.judge_body, (value) => polish(stripSectionLabels(value)));
  return {
    ...draft,
    company_name: company,
    company_descriptor: draft.company_descriptor ? polish(draft.company_descriptor) : null,
    core_task: participant(asSecondPerson(stripSectionLabels(draft.core_task))),
    situation_body: situationBody,
    judge_body: copySituationBullets(situationBody, judgeBody),
    judge_questions: [asSecondPerson(polish(draft.judge_questions[0])), asSecondPerson(polish(draft.judge_questions[1]))],
    judge_solution: draft.judge_solution
      ? {
          conceptIntro: polish(draft.judge_solution.conceptIntro),
          conceptBullets: draft.judge_solution.conceptBullets.map(polish),
          steps: draft.judge_solution.steps.map(polish),
          modelConclusion: polish(draft.judge_solution.modelConclusion),
        }
      : null,
  };
}
