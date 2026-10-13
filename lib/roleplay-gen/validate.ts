import { getEvent } from "@/lib/roleplay-gen/catalog";
import type { BodyBlock, ScenarioDraft, Selection } from "@/lib/roleplay-gen/types";
import {
  closingText,
  countWords,
  judgeBodyText,
  judgeIntro,
  judgeProcedure,
  openingText,
  participantText,
} from "@/lib/roleplay-gen/render";

export const SITUATION_WORD_SLACK = 15;

export const ANSWER_SCRIPT =
  /\b(?:in your prepared materials|prepared materials|be prepared to|be sure to (?:include|cover|address|discuss|explain)|your (?:presentation|materials|response|plan) (?:should|must) (?:include|cover|address|discuss)|make sure (?:you|your)|you propose to)\b/i;

const LEGACY = [
  "21st century",
  "problem solving –",
  "problem solving -",
  "creativity and innovation",
  "little/no value",
  "below expectations",
  "meets expectations",
  "exceeds expectations",
];

const BANNED = /\b(alcohol|tobacco|vaping|vapes|cigarette|casino|gambling|firearm|handgun|rifle)\b/i;

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

function escapeRegExp(value: string) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

export function sixWordPhrases(text: string) {
  const words = text.toLowerCase().replace(/[^a-z0-9\s]/g, " ").split(/\s+/).filter(Boolean);
  const found: string[] = [];
  for (let index = 0; index + 6 <= words.length; index += 1) {
    found.push(words.slice(index, index + 6).join(" "));
  }
  return found;
}

function bulletLists(blocks: BodyBlock[]) {
  return blocks.filter((block): block is { type: "bullets"; items: string[] } => block.type === "bullets");
}

function numbersIn(text: string) {
  return text.match(/\d[\d,]*(?:\.\d+)?%?/g) ?? [];
}

const PI_CODE = /\b[A-Za-z]{2,4}:\d{2,4}\b/;

export function containsPiCode(text: string) {
  return PI_CODE.test(text);
}

export function textHasNumber(text: string, target: number) {
  const tokens = text.match(/\$?\d[\d,]*(?:\.\d+)?%?/g) ?? [];
  const tolerance = Math.abs(target) >= 1 ? Math.max(0.05, Math.abs(target) * 0.0001) : 0.0001;
  return tokens.some((token) => {
    const percent = token.includes("%");
    const value = Number(token.replace(/[$,]/g, "").replace("%", ""));
    if (!Number.isFinite(value)) return false;
    if (Math.abs(value - target) <= tolerance) return true;
    return percent && Math.abs(value / 100 - target) <= tolerance;
  });
}

export function expressionOperands(expression: string) {
  return (expression.match(/\d+(?:\.\d+)?/g) ?? [])
    .map((token) => Number(token))
    .filter((value) => Number.isFinite(value));
}

export function evaluateExpression(expression: string) {
  const cleaned = expression.replace(/\s+/g, "");
  if (!/^[\d.+\-*/()]+$/.test(cleaned)) return null;
  let index = 0;

  const peek = () => cleaned[index];

  const parseFactor = (): number | null => {
    if (peek() === "(") {
      index += 1;
      const value = parseExpression();
      if (value == null || peek() !== ")") return null;
      index += 1;
      return value;
    }
    let sign = 1;
    if (peek() === "+" || peek() === "-") {
      sign = peek() === "-" ? -1 : 1;
      index += 1;
    }
    const start = index;
    while (/[\d.]/.test(peek() ?? "")) index += 1;
    if (start === index) return null;
    const value = Number(cleaned.slice(start, index));
    return Number.isFinite(value) ? sign * value : null;
  };

  const parseTerm = (): number | null => {
    let value = parseFactor();
    if (value == null) return null;
    while (peek() === "*" || peek() === "/") {
      const operator = cleaned[index];
      index += 1;
      const right = parseFactor();
      if (right == null || (operator === "/" && right === 0)) return null;
      value = operator === "*" ? value * right : value / right;
    }
    return value;
  };

  const parseExpression = (): number | null => {
    let value = parseTerm();
    if (value == null) return null;
    while (peek() === "+" || peek() === "-") {
      const operator = cleaned[index];
      index += 1;
      const right = parseTerm();
      if (right == null) return null;
      value = operator === "+" ? value + right : value - right;
    }
    return value;
  };

  const value = parseExpression();
  if (value == null || index !== cleaned.length) return null;
  return value;
}

export function isBareYesNo(question: string) {
  const normalized = question.trim().toLowerCase();
  if (/\b(why|how|what|difference|alternative|happen|risk)\b/.test(normalized)) return false;
  return /^(do|does|did|is|are|was|were|can|could|will|would|should|has|have)\b/.test(normalized);
}

function collectedText(draft: ScenarioDraft) {
  const blocks = [...draft.situation_body, ...draft.judge_body].flatMap((block) =>
    block.type === "p" ? [block.text] : block.items,
  );
  return [
    draft.participant_role,
    draft.company_name ?? "",
    draft.company_descriptor ?? "",
    draft.core_task,
    draft.judge_ref,
    ...blocks,
    ...draft.judge_questions,
    draft.judge_solution?.conceptIntro ?? "",
    ...(draft.judge_solution?.conceptBullets ?? []),
    ...(draft.judge_solution?.steps ?? []),
    draft.judge_solution?.modelConclusion ?? "",
  ].join("\n");
}

export function validateDraft(selection: Selection, draft: ScenarioDraft, calculations: boolean) {
  const event = getEvent(selection.eventCode);
  const errors: string[] = [];
  const participant = participantText(draft, event);
  const [minWords, maxWords] = event.situation_word_range;
  const words = countWords(situationWords(participant));
  // The opening and closing are added in code, so allow a small margin around the official range.
  const slack = SITUATION_WORD_SLACK;
  if (words < minWords - slack || words > maxWords + slack) {
    const openingWords = countWords(openingText(draft, event));
    const closingWords = countWords(closingText(draft));
    const bodyWords = Math.max(0, words - openingWords - closingWords);
    const bodyMin = Math.max(30, minWords - openingWords - closingWords);
    const bodyMax = Math.max(bodyMin + 10, maxWords - openingWords - closingWords);
    errors.push(
      `situation_body is ${bodyWords} words. Rewrite only situation_body so it is between ${bodyMin} and ${bodyMax} words. Leave the judge bullet items unchanged. The full situation is ${words} words and must land near ${minWords}–${maxWords}.`,
    );
  }

  if (selection.pis.length !== event.pi_count) {
    errors.push(`Expected ${event.pi_count} performance indicators.`);
  }

  if (ANSWER_SCRIPT.test(participant) || ANSWER_SCRIPT.test(draft.core_task)) {
    errors.push("State the decision once. Do not list what the presentation must include.");
  }

  const participantLower = participant.toLowerCase();
  for (const pi of selection.pis) {
    for (const phrase of sixWordPhrases(pi.display_text)) {
      if (participantLower.includes(phrase)) {
        errors.push(`The situation quotes indicator ${pi.code}. Paraphrase the need instead of copying its wording.`);
        break;
      }
    }
  }

  const judgeRef = draft.judge_ref;
  if (/^(the\s+)?judge$/i.test(judgeRef) || judgeRef.length < 4) {
    errors.push('judge_ref must be a role such as "the supervisor" or "the owner". Do not use the word "judge" as the role.');
  } else {
    const escaped = escapeRegExp(judgeRef);
    const missingPlain = new RegExp(`(?<![A-Za-z])${escaped}(?!\\s*\\(judge\\))(?!'s)(?![A-Za-z])`, "i");
    const missingPossessive = new RegExp(`(?<![A-Za-z])${escaped}'s(?!\\s*\\(judge's\\))`, "i");
    if (missingPlain.test(participant) || missingPossessive.test(participant)) {
      errors.push(`Every time "${judgeRef}" appears for the participant, follow it with (judge), or write "${judgeRef}'s (judge's)".`);
    }
  }

  if (event.category === "personal_financial_literacy") {
    if (draft.company_name) errors.push("Personal finance scenarios do not have a company. Set company_name to null.");
    const questions = bulletLists(draft.situation_body);
    if (questions.length !== 1 || questions[0]!.items.length !== selection.pis.length) {
      errors.push(`Personal finance scenarios need one bullet list with ${selection.pis.length} client questions.`);
    }
  } else if (draft.company_name) {
    const company = draft.company_name;
    const matches = participant.match(new RegExp(`(?<![A-Za-z])${escapeRegExp(company)}(?![A-Za-z])`, "gi")) ?? [];
    if (matches.length < 2) {
      errors.push(`Use the company name ${company} at least twice, always in ALL CAPS.`);
    }
    if (matches.some((match) => match !== company)) {
      errors.push(`Write ${company} in ALL CAPS every time.`);
    }
  } else {
    errors.push("company_name is required for this event.");
  }

  if (event.category === "team_decision_making") {
    if (!draft.participant_roles?.length) errors.push("Team events need participant_roles.");
  }

  const judgeText = `${judgeIntro(draft, event)}\n${judgeBodyText(draft)}\n${judgeProcedure(draft, event)}`;
  if (event.category === "team_decision_making") {
    if (!judgeText.includes("participant team")) errors.push('Team judge materials must say "participant team".');
  } else if (!judgeText.includes("participant")) {
    errors.push('Judge materials must refer to the "participant".');
  }

  const situationNumbers = new Set(numbersIn(participant));
  const extraNumbers = numbersIn(judgeBodyText(draft)).filter((value) => !situationNumbers.has(value));
  if (extraNumbers.length > 0) {
    errors.push(`Judge materials add numbers that are not in the situation: ${[...new Set(extraNumbers)].join(", ")}.`);
  }

  const situationBullets = bulletLists(draft.situation_body);
  const judgeBullets = bulletLists(draft.judge_body);
  if (situationBullets.length !== judgeBullets.length) {
    errors.push("Judge bullet lists must match the situation bullet lists.");
  } else {
    situationBullets.forEach((list, index) => {
      const other = judgeBullets[index]!;
      if (list.items.join("\n") !== other.items.join("\n")) {
        errors.push("Copy situation bullets into the judge materials without rewriting them.");
      }
    });
  }

  for (const code of selection.pis.map((pi) => pi.code)) {
    if (!draft.internal_notes.pi_hooks[code]?.trim()) {
      errors.push(`Add a pi_hooks sentence for ${code}.`);
    }
  }
  const outline = draft.internal_notes.strong_answer_outline.length;
  if (outline < 4 || outline > 7) errors.push("strong_answer_outline needs 4 to 7 bullets.");

  if (draft.judge_questions.length !== 2) errors.push("Include exactly two judge questions.");
  draft.judge_questions.forEach((question, index) => {
    if (isBareYesNo(question)) errors.push(`Judge question ${index + 1} needs an open why, how, or what — not a bare yes or no.`);
  });
  if (draft.judge_questions[0]?.trim() === draft.judge_questions[1]?.trim()) {
    errors.push("The two judge questions must be different.");
  }

  const corpus = `${participant}\n${collectedText(draft)}`.toLowerCase();
  for (const phrase of LEGACY) {
    if (corpus.includes(phrase)) errors.push(`Remove the old rubric wording "${phrase}".`);
  }
  if (/\b(district event|state event|icdc)\b/i.test(corpus)) {
    errors.push('Call this a practice event. Do not write District, State, or ICDC.');
  }
  const exposed = [
    participant,
    judgeText,
    draft.judge_solution?.conceptIntro ?? "",
    ...(draft.judge_solution?.conceptBullets ?? []),
    ...(draft.judge_solution?.steps ?? []),
    draft.judge_solution?.modelConclusion ?? "",
  ].join("\n");
  if (containsPiCode(exposed)) {
    errors.push("Remove performance indicator ids such as FI:354 from the situation, judge materials, and solution.");
  }
  if (BANNED.test(corpus)) errors.push("Remove alcohol, tobacco, vaping, gambling, or weapons.");
  for (const brand of BRANDS) {
    if (new RegExp(`\\b${escapeRegExp(brand)}\\b`, "i").test(corpus)) {
      errors.push(`Use a fictional company. Remove "${brand}".`);
    }
  }

  if (calculations) {
    if (draft.internal_notes.calculations.length === 0 || !draft.judge_solution) {
      errors.push("This calculation event needs calculations and a judge_solution.");
    }
    for (const calculation of draft.internal_notes.calculations) {
      const actual = evaluateExpression(calculation.expression);
      if (actual == null) {
        errors.push(`${calculation.label} needs an expression using only numbers and + - * / ( ).`);
        continue;
      }
      const tolerance = Math.abs(calculation.result) >= 1 ? Math.max(0.05, Math.abs(calculation.result) * 0.0001) : 0.0001;
      if (Math.abs(actual - calculation.result) > tolerance) {
        errors.push(`${calculation.label} evaluates to ${actual}, not ${calculation.result}.`);
      }
      const steps = draft.judge_solution?.steps.join(" ") ?? "";
      const shown = (steps.match(/\d[\d,]*(?:\.\d+)?%?/g) ?? []).some((token) => {
        const percent = token.endsWith("%");
        const value = Number(token.replace(/,/g, "").replace("%", ""));
        const candidate = percent ? value / 100 : value;
        return Number.isFinite(value) && Math.abs(candidate - calculation.result) <= tolerance;
      });
      if (!shown) {
        errors.push(`judge_solution.steps must show the ${calculation.label} result of ${calculation.result}.`);
      }
      const missing = expressionOperands(calculation.expression).filter((operand) => !textHasNumber(participant, operand));
      if (missing.length > 0) {
        errors.push(
          `${calculation.label} uses ${missing.join(", ")}, but those figures are not in the situation. Add a labeled bullet for each input, such as "Credit sales: $120,000". Do not leave the inputs only in the solution.`,
        );
      }
    }
  } else if (draft.internal_notes.calculations.length > 0 || draft.judge_solution) {
    errors.push("This scenario has no calculation page. Set calculations to [] and judge_solution to null.");
  }

  return errors;
}

function situationWords(text: string) {
  return text.replace(/\s+/g, " ");
}
