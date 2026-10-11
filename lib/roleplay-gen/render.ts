import {
  calculationsMode,
  clusterName,
  getEvent,
  levelsOfEvaluation,
  rubricFor,
} from "@/lib/roleplay-gen/catalog";
import type {
  BodyBlock,
  KitEvent,
  PracticePacket,
  RubricItem,
  ScenarioDraft,
  Selection,
} from "@/lib/roleplay-gen/types";

const PRACTICE_MODEL_LABEL = "GPT-5 nano";

export function countWords(text: string) {
  const trimmed = text.trim();
  if (!trimmed) return 0;
  return trimmed.split(/\s+/).length;
}

function capitalize(value: string) {
  if (!value) return value;
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function participantOpen(draft: ScenarioDraft) {
  if (draft.judge_opening === "hear_information") return "asking to hear the information";
  if (draft.judge_opening.startsWith("ask_about:")) {
    return `asking you about ${draft.judge_opening.slice("ask_about:".length).trim()}`;
  }
  return "asking to hear your ideas";
}

function judgeOpen(draft: ScenarioDraft) {
  if (draft.judge_opening === "hear_information") return "asking to hear the information";
  if (draft.judge_opening.startsWith("ask_about:")) {
    return `asking about ${draft.judge_opening.slice("ask_about:".length).trim()}`;
  }
  return "asking to hear the ideas";
}

function participantPlace(draft: ScenarioDraft) {
  if (draft.closing_location === "participant_office") return "in your office";
  if (draft.closing_location.startsWith("on_site:")) {
    return `at ${draft.closing_location.slice("on_site:".length).trim()}`;
  }
  return `in ${draft.judge_ref}'s (judge's) office`;
}

function judgePlace(draft: ScenarioDraft) {
  if (draft.closing_location === "participant_office") return "in the participant's office";
  if (draft.closing_location.startsWith("on_site:")) {
    return `at ${draft.closing_location.slice("on_site:".length).trim()}`;
  }
  return "in your office";
}

export function openingText(draft: ScenarioDraft, event: KitEvent) {
  const judge = draft.judge_ref;
  if (event.category === "personal_financial_literacy" || !draft.company_name) {
    return `You are to assume the role of ${draft.participant_role}. ${capitalize(judge)} (judge) ${draft.core_task}.`;
  }
  const descriptor = draft.company_descriptor ? `, ${draft.company_descriptor}` : "";
  const preposition = draft.preposition ?? "at";
  if (event.category === "team_decision_making") {
    const roles = draft.participant_roles?.join(" and ") || draft.participant_role;
    return `You are to assume the roles of ${roles} ${preposition} ${draft.company_name}${descriptor}. ${yourJudge(judge)} (judge) wants you to ${draft.core_task}.`;
  }
  return `You are to assume the role of ${draft.participant_role} ${preposition} ${draft.company_name}${descriptor}. ${yourJudge(judge)} (judge) wants you to ${draft.core_task}.`;
}

function yourJudge(judge: string) {
  if (/^(?:the|your)\s+/i.test(judge)) return `Your ${judge.replace(/^(?:the|your)\s+/i, "")}`;
  return capitalize(judge);
}

export function closingText(draft: ScenarioDraft) {
  const judge = draft.judge_ref;
  const noun = draft.presentation_noun;
  const meeting = draft.meeting_word;
  return `You will present your ${noun} to ${judge} (judge) in a ${meeting} to take place ${participantPlace(draft)}. ${capitalize(judge)} (judge) will begin the ${meeting} by greeting you and ${participantOpen(draft)}. After you have presented your ${noun} and have answered ${judge}'s (judge's) questions, ${judge} (judge) will conclude the ${meeting} by thanking you for your ${draft.thanks_for}.`;
}

export function situationPieces(draft: ScenarioDraft, event: KitEvent) {
  const body = draft.situation_body.flatMap((block) => (block.type === "p" ? [block.text] : block.items));
  return [openingText(draft, event), ...body, closingText(draft)];
}

export function participantText(draft: ScenarioDraft, event: KitEvent) {
  return situationPieces(draft, event).join("\n");
}

export function judgeIntro(draft: ScenarioDraft, event: KitEvent) {
  if (event.category === "personal_financial_literacy" || !draft.company_name) {
    return `You are to assume the role of ${draft.judge_ref} of ${draft.participant_role} (participant).`;
  }
  const role = draft.judge_ref.replace(/^the\s+/i, "");
  const preposition = draft.preposition ?? "at";
  return `You are to assume the role of ${role} ${preposition} ${draft.company_name}.`;
}

export function judgeProcedure(draft: ScenarioDraft, event: KitEvent) {
  const team = event.category === "team_decision_making";
  const who = team ? "participant team" : "participant";
  const sentences = [
    `The ${who} will present to you ${judgePlace(draft)}. Begin by greeting the ${who} and ${judgeOpen(draft)}.`,
  ];
  if (team) {
    sentences.push(
      "Let the team present without interruption unless they ask you something. Each team member should answer at least one question. Ask every team the same questions.",
    );
  }
  if (event.judge_questions_timing.toLowerCase().startsWith("after")) {
    sentences.push("After the participant has presented the information, ask these questions:");
  } else {
    sentences.push(`During the ${draft.meeting_word}, ask these questions:`);
  }
  sentences.push(
    `When the ${who} has finished presenting and has answered your questions, close by thanking the ${who} for the ${draft.thanks_for}. Do not comment on the performance after the event other than to thank the ${who}.`,
  );
  return sentences.join(" ");
}

function blockText(blocks: BodyBlock[]) {
  return blocks.flatMap((block) => (block.type === "p" ? [block.text] : block.items)).join("\n");
}

export function judgeBodyText(draft: ScenarioDraft) {
  return blockText(draft.judge_body);
}

function eventTitle(event: KitEvent) {
  if (event.category === "personal_financial_literacy") return "PERSONAL FINANCIAL LITERACY";
  return `${event.name.toUpperCase()} EVENT`;
}

function headerValue(label: string, event: KitEvent, selection: Selection) {
  const key = label.toUpperCase();
  if (key.includes("PATHWAY")) return event.pathway ?? "";
  if (key.includes("CLUSTER")) return clusterName(event);
  if (key.includes("INSTRUCTIONAL")) return selection.primaryIA.name;
  return "";
}

function bandRange(band: [number, number]) {
  return band[0] === band[1] ? String(band[1]) : `${band[0]}–${band[1]}`;
}

function solutionItems(event: KitEvent, calculations: boolean) {
  const rubric = rubricFor(event);
  const section = rubric.sections.find((item) => item.name === "Solution");
  return (section?.items ?? []).map((item, index) => {
    if (index === 0 && calculations && item.calculation_event_variant) return item.calculation_event_variant;
    return { label: item.label, description: item.description };
  });
}

function competencyItems(event: KitEvent) {
  const section = rubricFor(event).sections.find((item) => item.name === "Career Competencies");
  return (section?.items ?? []).map((item) => ({ label: item.label, description: item.description }));
}

function instructionsFor(event: KitEvent) {
  const team = event.category === "team_decision_making";
  const situation = team ? "Case Study Situation" : "Event Situation";
  const lines = [
    `This practice event is presented through the Career Competencies, Performance Indicators, and ${situation} on these pages.`,
    `You have up to ${event.prep_minutes} minutes to review the material and prepare. You may make notes on the materials provided and use them during the presentation.`,
    team
      ? `You have up to ${event.present_minutes} minutes to present to the judge. Both team members must take part in the presentation and in answering questions.`
      : `You have up to ${event.present_minutes} minutes to present to the judge.`,
    team
      ? "You will be evaluated on your solution to the case study, how well you incorporate the performance indicators, and how you demonstrate the career competencies."
      : "You will be evaluated on your solution to the event situation, how well you incorporate the performance indicators, and how you demonstrate the career competencies.",
    "Turn in all notes and event materials when you finish.",
  ];
  return lines;
}

function itemRow(section: string, item: Pick<RubricItem, "label" | "description">, max: number, bands: Record<string, [number, number]>, levels: string[]) {
  return {
    section,
    label: item.label,
    description: item.description,
    max,
    bands: levels.map((level) => ({ level, range: bandRange(bands[level] ?? [0, 0]) })),
  };
}

export function renderPacket(selection: Selection, draft: ScenarioDraft, calculations: boolean): PracticePacket {
  const event = getEvent(selection.eventCode);
  const rubric = rubricFor(event);
  const levels = levelsOfEvaluation();
  const levelNames = levels.levels;
  const pieces = situationPieces(draft, event);
  const rows = rubric.sections.flatMap((section) => {
    if (section.per_pi) {
      return selection.pis.map((pi) =>
        itemRow(section.name, { label: pi.display_text, description: "" }, section.max_each, section.bands, levelNames),
      );
    }
    const items = section.name === "Solution" ? solutionItems(event, calculations) : (section.items ?? []);
    return items.map((item) => itemRow(section.name, item, section.max_each, section.bands, levelNames));
  });

  return {
    idLabel: `${event.code} · Practice Event`,
    title: eventTitle(event),
    headerLines: event.header_lines
      .map((label) => ({ label, value: headerValue(label, event, selection) }))
      .filter((line) => line.value),
    instructions: instructionsFor(event),
    solution: solutionItems(event, calculations),
    competencies: competencyItems(event),
    performanceIndicators: selection.pis.map((pi) => pi.display_text),
    opening: pieces[0] ?? "",
    blocks: draft.situation_body,
    closing: pieces[pieces.length - 1] ?? "",
    wordCount: countWords(pieces.join(" ")),
    wordRange: event.situation_word_range,
    judgeIntro: judgeIntro(draft, event),
    judgeBlocks: draft.judge_body,
    judgeProcedure: judgeProcedure(draft, event),
    judgeQuestions: draft.judge_questions,
    judgeSolution: calculations ? draft.judge_solution : null,
    evaluation: {
      formTitle: `${event.name.toUpperCase()} – 2026–27`,
      instructionalArea: selection.primaryIA.name,
      weighting: event.eval_weighting_line,
      levels: levelNames,
      focusAreas: Object.entries(levels.focus_areas).map(([name, cells]) => ({ name, cells })),
      rows,
      total: rubric.total,
    },
    studyNotes: {
      hooks: selection.pis.map((pi) => ({
        label: pi.display_text,
        hook: draft.internal_notes.pi_hooks[pi.code] ?? "",
      })),
      outline: draft.internal_notes.strong_answer_outline,
    },
    companyName: draft.company_name,
    seed: selection.seed,
    model: PRACTICE_MODEL_LABEL,
  };
}

export function wantsCalculations(eventCode: string, requested: boolean | undefined) {
  const event = getEvent(eventCode);
  const mode = calculationsMode(event);
  if (mode === "always") return true;
  if (mode === "optional") return Boolean(requested);
  return false;
}
