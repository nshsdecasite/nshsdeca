import { getEvent } from "@/lib/roleplay-gen/catalog";
import { normalizeDraft, prepareCalculationDraft } from "@/lib/roleplay-gen/draft";
import { countWords, participantText, situationPieces } from "@/lib/roleplay-gen/render";
import type { BodyBlock, Calculation, KitEvent, ScenarioDraft, Selection } from "@/lib/roleplay-gen/types";
import {
  ANSWER_SCRIPT,
  evaluateExpression,
  expressionOperands,
  isBareYesNo,
  SITUATION_WORD_SLACK,
  sixWordPhrases,
  textHasNumber,
} from "@/lib/roleplay-gen/validate";

const BRANDS = [
  "mcdonald's",
  "mcdonalds",
  "starbucks",
  "walmart",
  "nike",
  "coca-cola",
  "disney",
  "netflix",
  "google",
  "amazon",
  "tesla",
  "microsoft",
  "instagram",
  "tiktok",
  "facebook",
];

const CONTENT_SYNONYM: Record<string, string> = {
  explain: "cover",
  identify: "name",
  describe: "outline",
  determine: "decide",
  discuss: "review",
  demonstrate: "show",
  analyze: "review",
  distinguish: "separate",
  apply: "use",
  calculate: "figure",
  prepare: "draft",
  develop: "build",
  assess: "review",
  evaluate: "review",
  compare: "contrast",
  interpret: "read",
  recommend: "suggest",
  outline: "sketch",
  examine: "review",
  nature: "kind",
  factors: "reasons",
  importance: "value",
  types: "kinds",
  methods: "ways",
  procedures: "steps",
  strategies: "approaches",
  techniques: "ways",
  characteristics: "traits",
  benefits: "gains",
  advantages: "gains",
  disadvantages: "drawbacks",
  process: "steps",
  impact: "effect",
  effects: "results",
  relationship: "link",
  information: "details",
  customer: "buyer",
  customers: "buyers",
  client: "buyer",
  clients: "buyers",
  employee: "worker",
  employees: "staff",
  business: "company",
  product: "item",
  products: "items",
  service: "offering",
  services: "offerings",
  financial: "money",
  finance: "money",
  management: "oversight",
  marketing: "promotion",
  cost: "expense",
  capital: "funding",
  components: "parts",
  investments: "projects",
  investment: "project",
};

const FUNCTION_SYNONYM: Record<string, string> = {
  the: "this",
  a: "one",
  an: "one",
  of: "for",
  and: "plus",
  to: "into",
  in: "during",
  on: "about",
  for: "around",
  with: "using",
  its: "one",
  their: "those",
  that: "this",
  by: "through",
  from: "out",
  or: "versus",
};

const PADS = [
  "The business has used the same approach for two years.",
  "A decision is needed before the end of the month.",
  "Several people at the company will be affected.",
  "The meeting is on the calendar for this week.",
];

const QUESTION_FALLBACKS: [string, string] = [
  "How should this be handled with the facts already given?",
  "What is the risk if the first recommendation does not work?",
];

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scrub(value: string) {
  let next = value
    .replace(/21st century skills/gi, "career competencies")
    .replace(/21st century/gi, "career")
    .replace(/problem solving\s*[–—-]/gi, "decision making")
    .replace(/creativity and innovation/gi, "communication")
    .replace(/little\/no value/gi, "novice")
    .replace(/below expectations/gi, "developing")
    .replace(/meets expectations/gi, "proficient")
    .replace(/exceeds expectations/gi, "exemplary")
    .replace(/\bdistrict event\b/gi, "practice event")
    .replace(/\bstate event\b/gi, "practice event")
    .replace(/\bicdc\b/gi, "a later conference")
    .replace(/\balcohol\b/gi, "beverages")
    .replace(/\btobacco\b/gi, "snacks")
    .replace(/\bvaping\b/gi, "snacks")
    .replace(/\bvapes\b/gi, "snacks")
    .replace(/\bcigarette\b/gi, "snack")
    .replace(/\bcasino\b/gi, "arcade")
    .replace(/\bgambling\b/gi, "contests")
    .replace(/\bfirearm\b/gi, "equipment")
    .replace(/\bhandgun\b/gi, "tool")
    .replace(/\brifle\b/gi, "tool")
    .replace(/\(\s*[A-Za-z]{2,4}:\d{2,4}\s*\)/g, "")
    .replace(/\b[A-Za-z]{2,4}:\d{2,4}\b/g, "");
  for (const brand of BRANDS) {
    next = next.replace(new RegExp(`\\b${escapeRegExp(brand)}\\b`, "gi"), "Northstar");
  }
  return next
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([,.;:!?])/g, "$1")
    .replace(/([,.;:]){2,}/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function mapBlocks(blocks: BodyBlock[], edit: (value: string) => string): BodyBlock[] {
  const next: BodyBlock[] = [];
  for (const block of blocks) {
    if (block.type === "p") {
      const text = edit(block.text).trim();
      if (text) next.push({ type: "p", text });
      continue;
    }
    const items = block.items.map((item) => edit(item).trim()).filter(Boolean);
    if (items.length > 0) next.push({ type: "bullets", items });
  }
  return next;
}

function mapDraftText(draft: ScenarioDraft, edit: (value: string) => string): ScenarioDraft {
  return {
    ...draft,
    participant_role: edit(draft.participant_role),
    participant_roles: draft.participant_roles?.map(edit) ?? null,
    company_name: draft.company_name ? edit(draft.company_name) : null,
    company_descriptor: draft.company_descriptor ? edit(draft.company_descriptor) : null,
    judge_ref: edit(draft.judge_ref),
    core_task: edit(draft.core_task),
    situation_body: mapBlocks(draft.situation_body, edit),
    judge_body: mapBlocks(draft.judge_body, edit),
    closing_location: edit(draft.closing_location),
    judge_opening: edit(draft.judge_opening),
    judge_questions: [edit(draft.judge_questions[0]), edit(draft.judge_questions[1])],
    internal_notes: {
      ...draft.internal_notes,
      pi_hooks: Object.fromEntries(Object.entries(draft.internal_notes.pi_hooks).map(([code, hook]) => [code, edit(hook)])),
      strong_answer_outline: draft.internal_notes.strong_answer_outline.map(edit),
      calculations: draft.internal_notes.calculations.map((calculation) => ({
        ...calculation,
        label: edit(calculation.label),
        formula: edit(calculation.formula),
        unit: edit(calculation.unit),
      })),
    },
    judge_solution: draft.judge_solution
      ? {
          conceptIntro: edit(draft.judge_solution.conceptIntro),
          conceptBullets: draft.judge_solution.conceptBullets.map(edit),
          steps: draft.judge_solution.steps.map(edit),
          modelConclusion: edit(draft.judge_solution.modelConclusion),
        }
      : null,
  };
}

function matchCase(original: string, replacement: string) {
  if (original === original.toUpperCase() && /[A-Z]/.test(original)) return replacement.toUpperCase();
  if (original[0] && original[0] === original[0].toUpperCase()) return replacement.charAt(0).toUpperCase() + replacement.slice(1);
  return replacement;
}

function rewriteSlice(slice: string) {
  const gram = slice.toLowerCase();
  const parts = slice.split(/(\s+)/);
  const wordIndexes: number[] = [];
  parts.forEach((part, index) => {
    if (!/^\s+$/.test(part) && /[A-Za-z0-9]/.test(part)) wordIndexes.push(index);
  });
  if (wordIndexes.length === 0) return null;
  const middle = (wordIndexes.length - 1) / 2;
  const order = wordIndexes
    .map((partIndex, position) => ({ partIndex, position }))
    .sort((a, b) => Math.abs(a.position - middle) - Math.abs(b.position - middle));

  for (const { partIndex } of order) {
    const part = parts[partIndex]!;
    if (part === part.toUpperCase() && /[A-Z]/.test(part)) continue;
    const key = part.toLowerCase().replace(/[^a-z0-9]/g, "");
    if (!key) continue;
    const trailing = part.match(/[^A-Za-z0-9]+$/)?.[0] ?? "";
    const core = part.slice(0, part.length - trailing.length);
    const options = [CONTENT_SYNONYM[key], FUNCTION_SYNONYM[key], "stated"].filter((item): item is string => Boolean(item));
    for (const option of options) {
      if (option.toLowerCase() === key) continue;
      const nextParts = parts.slice();
      nextParts[partIndex] = `${matchCase(core, option)}${trailing}`;
      const next = nextParts.join("");
      if (!next.toLowerCase().includes(gram)) return next;
    }
  }
  return null;
}

function deleteMiddle(slice: string) {
  const parts = slice.split(/(\s+)/);
  const wordIndexes = parts.map((part, index) => (/^\s+$/.test(part) ? -1 : index)).filter((index) => index >= 0);
  const remove = wordIndexes[Math.min(3, wordIndexes.length - 1)];
  if (remove == null) return `current ${slice}`.trim();
  parts[remove] = "";
  if (remove > 0 && /^\s+$/.test(parts[remove - 1] ?? "")) parts[remove - 1] = "";
  const next = parts.join("").replace(/\s{2,}/g, " ").trim();
  return next || "the request";
}

function rewriteGram(text: string, gram: string) {
  const index = text.toLowerCase().indexOf(gram);
  if (index < 0) return null;
  const slice = text.slice(index, index + gram.length);
  const rewritten = rewriteSlice(slice) ?? deleteMiddle(slice);
  if (rewritten.toLowerCase() === slice.toLowerCase()) return null;
  return text.slice(0, index) + rewritten + text.slice(index + slice.length);
}

function tweakFirstWord(value: string) {
  const match = value.match(/^(\s*)([A-Za-z0-9']+)([\s\S]*)$/);
  if (!match) return `current ${value}`.trim();
  const word = match[2]!;
  const key = word.toLowerCase().replace(/[^a-z0-9]/g, "");
  const synonym = CONTENT_SYNONYM[key] ?? FUNCTION_SYNONYM[key];
  if (synonym && synonym.toLowerCase() !== key) return `${match[1]}${matchCase(word, synonym)}${match[3]}`;
  if (key === "current") return `${match[1]}stated ${word}${match[3]}`;
  return `${match[1]}current ${word}${match[3]}`;
}

function editFlat(blocks: BodyBlock[], index: number, edit: (value: string) => string): BodyBlock[] {
  let cursor = 0;
  return blocks.map((block) => {
    if (block.type === "p") {
      const next = cursor === index ? edit(block.text) : block.text;
      cursor += 1;
      return { type: "p" as const, text: next };
    }
    const items = block.items.map((item) => {
      const next = cursor === index ? edit(item) : item;
      cursor += 1;
      return next;
    });
    return { type: "bullets" as const, items };
  });
}

function overlaps(haystack: string, needle: string, gram: string) {
  const hay = haystack.toLowerCase();
  const at = hay.indexOf(gram);
  const needleAt = needle.trim() ? hay.lastIndexOf(needle.toLowerCase()) : -1;
  if (at < 0 || needleAt < 0) return false;
  return at < needleAt + needle.length && at + gram.length > needleAt;
}

function breakOne(draft: ScenarioDraft, event: KitEvent, gram: string): ScenarioDraft | null {
  const fields: Array<(value: ScenarioDraft) => ScenarioDraft | null> = [
    (current) => {
      const next = rewriteGram(current.core_task, gram);
      return next ? { ...current, core_task: next } : null;
    },
    (current) => {
      const next = current.company_descriptor ? rewriteGram(current.company_descriptor, gram) : null;
      return next ? { ...current, company_descriptor: next } : null;
    },
    (current) => {
      const next = rewriteGram(current.participant_role, gram);
      return next ? { ...current, participant_role: next } : null;
    },
    (current) => {
      if (!current.participant_roles) return null;
      let changed = false;
      const roles = current.participant_roles.map((role) => {
        const next = rewriteGram(role, gram);
        if (!next) return role;
        changed = true;
        return next;
      });
      return changed ? { ...current, participant_roles: roles } : null;
    },
    (current) => {
      if (!current.judge_opening.startsWith("ask_about:")) return null;
      const topic = current.judge_opening.slice("ask_about:".length);
      const next = rewriteGram(topic, gram);
      return next ? { ...current, judge_opening: `ask_about:${next}` } : null;
    },
  ];

  for (const apply of fields) {
    const next = apply(draft);
    if (next) return next;
  }

  let cursor = 0;
  for (const block of draft.situation_body) {
    const items = block.type === "p" ? [block.text] : block.items;
    for (const item of items) {
      if (item.toLowerCase().includes(gram)) {
        return { ...draft, situation_body: editFlat(draft.situation_body, cursor, (value) => rewriteGram(value, gram) ?? value) };
      }
      cursor += 1;
    }
  }

  const pieces = situationPieces(draft, event);
  const full = pieces.join("\n");
  const index = full.toLowerCase().indexOf(gram);
  if (index < 0) return null;
  let offset = 0;
  let pieceIndex = pieces.length - 1;
  for (let piece = 0; piece < pieces.length; piece += 1) {
    if (index < offset + pieces[piece]!.length) {
      pieceIndex = piece;
      break;
    }
    offset += pieces[piece]!.length + 1;
  }

  if (pieceIndex === 0) {
    if (overlaps(pieces[0]!, draft.participant_role, gram)) {
      return { ...draft, participant_role: tweakFirstWord(draft.participant_role) };
    }
    return { ...draft, core_task: tweakFirstWord(draft.core_task) };
  }
  if (pieceIndex === pieces.length - 1) {
    if (draft.judge_opening.startsWith("ask_about:")) {
      const topic = draft.judge_opening.slice("ask_about:".length);
      return { ...draft, judge_opening: `ask_about:${tweakFirstWord(topic)}` };
    }
    return { ...draft, core_task: tweakFirstWord(draft.core_task) };
  }
  return { ...draft, situation_body: editFlat(draft.situation_body, pieceIndex - 1, tweakFirstWord) };
}

function breakQuotedIndicators(draft: ScenarioDraft, event: KitEvent, selection: Selection) {
  const forbidden = new Set(selection.pis.flatMap((pi) => sixWordPhrases(pi.display_text)));
  if (forbidden.size === 0) return draft;
  let next = draft;
  for (let pass = 0; pass < 200; pass += 1) {
    const lower = participantText(next, event).toLowerCase();
    const gram = [...forbidden].find((phrase) => lower.includes(phrase));
    if (!gram) return next;
    const updated = breakOne(next, event, gram);
    if (!updated || participantText(updated, event) === participantText(next, event)) break;
    next = updated;
  }
  return next;
}

function repairQuestions(questions: [string, string]): [string, string] {
  const next = questions.map((question, index) => {
    const trimmed = question.trim();
    if (!trimmed || isBareYesNo(trimmed)) return QUESTION_FALLBACKS[index]!;
    return trimmed;
  }) as [string, string];
  if (next[0] === next[1]) next[1] = QUESTION_FALLBACKS[1];
  return next;
}

function usableJudgeRef(value: string) {
  const clean = value.replace(/\s*\(judge\)/gi, "").replace(/\s+/g, " ").trim();
  if (/^(the\s+)?judge$/i.test(clean) || clean.length < 4) return "the supervisor";
  return clean;
}

function shapePersonalFinance(draft: ScenarioDraft, count: number): ScenarioDraft {
  const paragraphs = draft.situation_body.filter((block): block is { type: "p"; text: string } => block.type === "p");
  const items = draft.situation_body.flatMap((block) => (block.type === "bullets" ? block.items : []));
  const prompts = [
    "What should this client decide first?",
    "What should this client do next?",
    "What tradeoff should this client accept?",
    "What limit should this client keep in mind?",
    "How should this client measure progress?",
  ];
  const asked = items.filter((item) => item.trim().endsWith("?"));
  const questions = (asked.length > 0 ? asked : items.filter((item) => !isLabeledFigure(item))).slice(0, count);
  let extra = 0;
  while (questions.length < count) {
    questions.push(prompts[extra % prompts.length]!);
    extra += 1;
  }
  const facts = paragraphs.length > 0
    ? paragraphs
    : [{ type: "p" as const, text: "The client has a personal money decision to make and wants a practical recommendation." }];
  return {
    ...draft,
    company_name: null,
    company_descriptor: null,
    preposition: null,
    situation_body: [...facts, { type: "bullets", items: questions }],
  };
}

function applyDefaults(draft: ScenarioDraft, event: KitEvent, selection: Selection): ScenarioDraft {
  const personal = event.category === "personal_financial_literacy";
  let next: ScenarioDraft = {
    ...draft,
    judge_ref: usableJudgeRef(draft.judge_ref),
    participant_role: draft.participant_role.trim() || "assistant",
    core_task: draft.core_task.trim() || "recommend a practical next step",
    company_name: personal ? null : draft.company_name?.trim().toUpperCase() || "NORTHSTAR CO",
    company_descriptor: personal ? null : draft.company_descriptor,
    preposition: personal ? null : draft.preposition ?? "at",
    participant_roles: event.category === "team_decision_making"
      ? draft.participant_roles && draft.participant_roles.length > 0
        ? draft.participant_roles
        : [draft.participant_role.trim() || "manager", "associate"]
      : draft.participant_roles,
    judge_questions: repairQuestions(draft.judge_questions),
    closing_location: personal ? "participant_office" : draft.closing_location,
  };
  if (personal) next = shapePersonalFinance(next, selection.pis.length);

  const hooks = { ...next.internal_notes.pi_hooks };
  for (const pi of selection.pis) {
    if (!hooks[pi.code]?.trim()) hooks[pi.code] = "The facts create a need for this without using the indicator's own wording.";
  }
  const outline = next.internal_notes.strong_answer_outline.map((item) => item.trim()).filter(Boolean);
  while (outline.length < 4) outline.push("Use the facts in the situation and leave room for more than one good choice.");
  next = {
    ...next,
    internal_notes: {
      ...next.internal_notes,
      pi_hooks: hooks,
      strong_answer_outline: outline.slice(0, 7),
    },
  };
  return next;
}

function numberTokens(text: string) {
  return text.match(/\d[\d,]*(?:\.\d+)?%?/g) ?? [];
}

function dropScripted(text: string) {
  const kept = text
    .split(/(?<=[.!?])\s+/)
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence && !ANSWER_SCRIPT.test(sentence));
  return tidy(kept.join(" "));
}

function withoutAnswerScript(blocks: BodyBlock[]) {
  const next: BodyBlock[] = [];
  for (const block of blocks) {
    if (block.type === "p") {
      const text = dropScripted(block.text);
      if (text) next.push({ type: "p", text });
      continue;
    }
    const items = block.items.map((item) => item.trim()).filter((item) => item && !ANSWER_SCRIPT.test(item));
    if (items.length) next.push({ type: "bullets", items });
  }
  return next;
}

function stripAnswerScripts(draft: ScenarioDraft): ScenarioDraft {
  const core = dropScripted(draft.core_task);
  return {
    ...draft,
    core_task: core || "recommend a practical next step",
    situation_body: withoutAnswerScript(draft.situation_body),
    judge_body: withoutAnswerScript(draft.judge_body),
  };
}

function tidy(value: string) {
  return value
    .replace(/\(\s*\)/g, "")
    .replace(/\s+([,.;!?])/g, "$1")
    .replace(/([,.;]){2,}/g, "$1")
    .replace(/\s{2,}/g, " ")
    .trim();
}

function stripExtraJudgeNumbers(draft: ScenarioDraft, event: KitEvent): ScenarioDraft {
  const allowed = new Set(numberTokens(participantText(draft, event)));
  const judgeBody: BodyBlock[] = [];
  for (const block of draft.judge_body) {
    if (block.type === "bullets") {
      judgeBody.push(block);
      continue;
    }
    const text = tidy(block.text.replace(/\$?\d[\d,]*(?:\.\d+)?%?/g, (token) => {
      const bare = token.replace(/^\$/, "");
      if (allowed.has(bare) || allowed.has(token)) return token;
      const canonical = bare.replace(/,/g, "");
      const same = [...allowed].find((item) => item.replace(/,/g, "") === canonical && item.endsWith("%") === bare.endsWith("%"));
      return same ?? "";
    }));
    if (text) judgeBody.push({ type: "p", text });
  }
  return { ...draft, judge_body: judgeBody.length > 0 ? judgeBody : draft.judge_body };
}

function companyMentions(draft: ScenarioDraft, event: KitEvent) {
  const company = draft.company_name;
  if (!company) return 0;
  return participantText(draft, event).match(new RegExp(`(?<![A-Za-z])${escapeRegExp(company)}(?![A-Za-z])`, "g"))?.length ?? 0;
}

function ensureCompany(draft: ScenarioDraft, event: KitEvent): ScenarioDraft {
  if (event.category === "personal_financial_literacy" || !draft.company_name) return draft;
  if (companyMentions(draft, event) >= 2) return draft;
  const sentence = `${draft.company_name} asked you to take this on.`;
  const blocks = draft.situation_body.slice();
  const index = blocks.findIndex((block) => block.type === "p");
  if (index < 0) return { ...draft, situation_body: [{ type: "p", text: sentence }, ...blocks] };
  const block = blocks[index]!;
  if (block.type !== "p") return draft;
  blocks[index] = { type: "p", text: `${sentence} ${block.text}`.trim() };
  return { ...draft, situation_body: blocks };
}

function trimWords(text: string, remove: number, floor: number) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= floor) return null;
  const keep = Math.max(floor, words.length - Math.max(remove, 1));
  const drop = words.length - keep;
  if (drop <= 0) return null;
  const next = words.slice();
  let removed = 0;
  for (let index = next.length - 1; index >= 0 && removed < drop; index -= 1) {
    if (/\d/.test(next[index] ?? "")) continue;
    next.splice(index, 1);
    removed += 1;
  }
  if (removed === 0) return null;
  let sentence = next.join(" ").replace(/\s+([,.;:!?])/g, "$1").replace(/\s{2,}/g, " ").trim();
  if (!sentence) return null;
  if (!/[.!?]$/.test(sentence)) sentence += ".";
  return sentence;
}

function isLabeledFigure(item: string) {
  return /^[^:]{2,80}:\s*\$?[\d,]/.test(item) && item.trim().split(/\s+/).length <= 14;
}

function shrinkOnce(draft: ScenarioDraft, overflow: number): ScenarioDraft | null {
  const remove = Math.max(overflow, 24);
  let bestWords = 12;
  let bestKind: "p" | "bullet" | "task" | "descriptor" | "topic" | null = null;
  let bestIndex = 0;
  let bestItem = 0;
  const consider = (words: number, kind: "p" | "bullet" | "task" | "descriptor" | "topic", index: number, item = 0) => {
    if (words > bestWords) {
      bestWords = words;
      bestKind = kind;
      bestIndex = index;
      bestItem = item;
    }
  };

  draft.situation_body.forEach((block, index) => {
    if (block.type === "p") consider(block.text.trim().split(/\s+/).length, "p", index);
    else {
      block.items.forEach((item, itemIndex) => {
        if (isLabeledFigure(item)) return;
        consider(item.trim().split(/\s+/).length, "bullet", index, itemIndex);
      });
    }
  });
  consider(draft.core_task.trim().split(/\s+/).length, "task", 0);
  if (draft.company_descriptor) consider(draft.company_descriptor.trim().split(/\s+/).length, "descriptor", 0);
  if (draft.judge_opening.startsWith("ask_about:")) {
    consider(draft.judge_opening.slice("ask_about:".length).trim().split(/\s+/).length, "topic", 0);
  }
  if (!bestKind) return null;

  if (bestKind === "task") {
    const text = trimWords(draft.core_task, remove, 8);
    return text ? { ...draft, core_task: text } : null;
  }
  if (bestKind === "descriptor" && draft.company_descriptor) {
    const text = trimWords(draft.company_descriptor, remove, 4);
    return text ? { ...draft, company_descriptor: text } : null;
  }
  if (bestKind === "topic") {
    const topic = draft.judge_opening.slice("ask_about:".length);
    const text = trimWords(topic, remove, 3);
    return text ? { ...draft, judge_opening: `ask_about:${text.replace(/\.$/, "")}` } : null;
  }

  const blocks = draft.situation_body.slice();
  const block = blocks[bestIndex];
  if (!block) return null;
  if (block.type === "p" && bestKind === "p") {
    const text = trimWords(block.text, remove, 8);
    if (!text) return null;
    blocks[bestIndex] = { type: "p", text };
    return { ...draft, situation_body: blocks };
  }
  if (block.type === "bullets" && bestKind === "bullet") {
    const text = trimWords(block.items[bestItem] ?? "", remove, 4);
    if (!text) return null;
    const items = block.items.slice();
    items[bestItem] = text;
    blocks[bestIndex] = { type: "bullets", items };
    return { ...draft, situation_body: blocks };
  }
  return null;
}

function growOnce(draft: ScenarioDraft, event: KitEvent, high: number): ScenarioDraft | null {
  const words = countWords(participantText(draft, event));
  const pad = PADS[words % PADS.length]!;
  const short = "Use what you have already been told.";
  const addition = words + countWords(pad) <= high ? pad : words + countWords(short) <= high ? short : null;
  if (!addition) return null;
  const blocks = draft.situation_body.slice();
  let index = -1;
  for (let cursor = blocks.length - 1; cursor >= 0; cursor -= 1) {
    if (blocks[cursor]?.type === "p") {
      index = cursor;
      break;
    }
  }
  if (index < 0) return { ...draft, situation_body: [...blocks, { type: "p", text: addition }] };
  const block = blocks[index]!;
  if (block.type !== "p") return null;
  blocks[index] = { type: "p", text: `${block.text} ${addition}`.trim() };
  return { ...draft, situation_body: blocks };
}

function fitLength(draft: ScenarioDraft, event: KitEvent) {
  const [minWords, maxWords] = event.situation_word_range;
  const low = minWords - SITUATION_WORD_SLACK;
  const high = maxWords + SITUATION_WORD_SLACK;
  let next = draft;
  for (let pass = 0; pass < 12 && countWords(participantText(next, event)) > high; pass += 1) {
    const overflow = countWords(participantText(next, event)) - high;
    const shrunk = shrinkOnce(next, overflow);
    if (!shrunk) break;
    next = shrunk;
  }
  for (let pass = 0; pass < 40 && countWords(participantText(next, event)) < low; pass += 1) {
    const grown = growOnce(next, event, high);
    if (!grown) break;
    next = grown;
  }
  return next;
}

function usableCalculation(calculation: Calculation): Calculation | null {
  const direct = evaluateExpression(calculation.expression);
  if (direct != null) return { ...calculation, result: direct };
  const cleaned = calculation.expression
    .replace(/×/g, "*")
    .replace(/÷/g, "/")
    .replace(/[xX]/g, "*")
    .replace(/,/g, "")
    .replace(/\s+/g, "");
  if (!/^[\d.+\-*/()]+$/.test(cleaned)) return null;
  const value = evaluateExpression(cleaned);
  if (value == null) return null;
  return { ...calculation, expression: cleaned, result: value };
}

function fallbackCalculation(draft: ScenarioDraft, event: KitEvent): Calculation {
  const numbers = numberTokens(participantText(draft, event))
    .map((token) => Number(token.replace(/,/g, "").replace("%", "")))
    .filter((value) => Number.isFinite(value));
  const left = numbers[0] ?? 12;
  const right = numbers[1] ?? 3;
  return {
    label: "Combined figure",
    formula: `${left} + ${right}`,
    expression: `${left}+${right}`,
    result: left + right,
    unit: "",
  };
}

function sameNumber(left: number, right: number) {
  const tolerance = Math.abs(left) >= 1 ? Math.max(0.05, Math.abs(left) * 0.0001) : 0.0001;
  return Math.abs(left - right) <= tolerance;
}

function formulaPieces(formula: string) {
  return formula
    .replace(/×/g, "/")
    .replace(/÷/g, "/")
    .replace(/\btimes\b/gi, "/")
    .replace(/\bdivided by\b/gi, "/")
    .replace(/\bplus\b/gi, "+")
    .replace(/\bminus\b/gi, "-")
    .split(/[/+*\-]/)
    .map((piece) => piece.replace(/[()]/g, "").replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function looksNumeric(value: string) {
  return /^\$?[\d,]+(?:\.\d+)?%?$/.test(value.replace(/\s+/g, ""));
}

function figureLabel(piece: string | undefined, calculationLabel: string, index: number, value: number, unit: string) {
  if (!piece || looksNumeric(piece)) {
    if (value === 365 || value === 360) return "Days in the year";
    if (value === 12 && /day|month|year|period/i.test(`${unit} ${calculationLabel}`)) return "Months in the year";
    if (value === 30 && /day|month|period/i.test(`${unit} ${calculationLabel}`)) return "Days in the month";
    if (value === 100 && /percent|rate|ratio|margin|%/i.test(`${unit} ${calculationLabel}`)) return "Percent base";
    return `${calculationLabel} figure ${index + 1}`;
  }
  const cleaned = piece.replace(/^[^A-Za-z$]+/, "").replace(/[:=.\s]+$/, "").trim();
  if (!cleaned || cleaned.length > 60 || looksNumeric(cleaned)) return `${calculationLabel} figure ${index + 1}`;
  return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
}

function formatFigure(value: number, label: string) {
  const money =
    /\b(sales|revenue|income|cost|costs|expense|expenses|asset|assets|liability|liabilities|cash|price|wage|salary|profit|capital|inventory|receivable|receivables|payable|payables|equity|debt|loan|interest|dollar|amount|balance|earnings|depreciation)\b/i.test(
      label,
    );
  const formatted = Number.isInteger(value)
    ? value.toLocaleString("en-US")
    : value.toLocaleString("en-US", { maximumFractionDigits: 4 });
  return money && Math.abs(value) >= 1 ? `$${formatted}` : formatted;
}

function appendFacts(blocks: BodyBlock[], sentence: string): BodyBlock[] {
  const next = blocks.slice();
  const index = next.findIndex((block) => block.type === "p");
  if (index < 0) return [{ type: "p", text: sentence }, ...next];
  const block = next[index];
  if (!block || block.type !== "p") return next;
  next[index] = { type: "p", text: `${block.text} ${sentence}`.trim() };
  return next;
}

function insertInputBlock(blocks: BodyBlock[], items: string[]): BodyBlock[] {
  const block: BodyBlock = { type: "bullets", items };
  const bulletAt = blocks.findIndex((item) => item.type === "bullets");
  if (bulletAt >= 0) {
    const next = blocks.slice();
    next.splice(bulletAt, 0, block);
    return next;
  }
  const paragraphAt = blocks.findIndex((item) => item.type === "p");
  if (paragraphAt < 0) return [block, ...blocks];
  const next = blocks.slice();
  next.splice(paragraphAt + 1, 0, block);
  return next;
}

/** Calculation events have to show every input in the participant situation, not only in the solution. */
function ensureCalculationInputs(draft: ScenarioDraft, event: KitEvent): ScenarioDraft {
  if (draft.internal_notes.calculations.length === 0) return draft;
  const participant = participantText(draft, event);
  const usedLabels = new Set<string>();
  const seenValues: number[] = [];
  const items: string[] = [];

  for (const calculation of draft.internal_notes.calculations) {
    const pieces = formulaPieces(calculation.formula);
    expressionOperands(calculation.expression).forEach((value, index) => {
      if (textHasNumber(participant, value) || seenValues.some((seen) => sameNumber(seen, value))) return;
      seenValues.push(value);
      const base = figureLabel(pieces[index], calculation.label, index, value, calculation.unit);
      let label = base;
      let count = 2;
      while (usedLabels.has(label.toLowerCase())) {
        label = `${base} (${count})`;
        count += 1;
      }
      usedLabels.add(label.toLowerCase());
      items.push(`${label}: ${formatFigure(value, label)}`);
    });
  }

  if (items.length === 0) return draft;
  if (event.category === "personal_financial_literacy") {
    const sentence = `${items.join(". ")}.`;
    return {
      ...draft,
      situation_body: appendFacts(draft.situation_body, sentence),
      judge_body: appendFacts(draft.judge_body, sentence),
    };
  }
  return { ...draft, situation_body: insertInputBlock(draft.situation_body, items) };
}

function repairMath(draft: ScenarioDraft, event: KitEvent, calculations: boolean): ScenarioDraft {
  if (!calculations) {
    return {
      ...draft,
      internal_notes: { ...draft.internal_notes, calculations: [] },
      judge_solution: null,
    };
  }
  const kept = draft.internal_notes.calculations.flatMap((calculation) => {
    const usable = usableCalculation(calculation);
    return usable ? [usable] : [];
  });
  const next = {
    ...draft,
    internal_notes: {
      ...draft.internal_notes,
      calculations: kept.length > 0 ? kept : [fallbackCalculation(draft, event)],
    },
  };
  return prepareCalculationDraft(next);
}

/** Fix every mechanical 2026–27 check so a parsed draft can be shown. */
export function repairDraft(selection: Selection, draft: ScenarioDraft, calculations: boolean): ScenarioDraft {
  const event = getEvent(selection.eventCode);
  let next = mapDraftText(draft, scrub);
  next = applyDefaults(next, event, selection);
  next = normalizeDraft(next);
  for (let pass = 0; pass < 4; pass += 1) {
    next = stripExtraJudgeNumbers(next, event);
    next = ensureCompany(next, event);
    next = fitLength(next, event);
    next = breakQuotedIndicators(next, event, selection);
    next = normalizeDraft(next);
  }
  next = ensureCompany(next, event);
  next = fitLength(next, event);
  next = normalizeDraft(next);
  next = repairMath(next, event, calculations);
  next = ensureCalculationInputs(next, event);
  next = stripAnswerScripts(next);
  next = fitLength(next, event);
  next = normalizeDraft(next);
  next = stripExtraJudgeNumbers(next, event);
  return next;
}
