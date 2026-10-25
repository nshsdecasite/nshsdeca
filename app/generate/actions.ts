"use server";

import { revalidateTag } from "next/cache";
import { requireAuth } from "@/lib/auth/roles";
import { clusterName, getEvent } from "@/lib/roleplay-gen/catalog";
import { parseDraft, parseModelJson } from "@/lib/roleplay-gen/draft";
import { repairDraft } from "@/lib/roleplay-gen/repair";
import { completeJson } from "@/lib/roleplay-gen/openai";
import { ROLEPLAY_WRITER_PROMPT, writerPayload } from "@/lib/roleplay-gen/prompt";
import { judgeDocument, situationDocument, solutionDocument, wantsCalculations } from "@/lib/roleplay-gen/render";
import { selectPIs } from "@/lib/roleplay-gen/select";
import type { GenerateInput, ScenarioDraft, Selection } from "@/lib/roleplay-gen/types";
import { validateDraft } from "@/lib/roleplay-gen/validate";
import { createClient } from "@/lib/supabase/server";

export type GenerateResult =
  | { ok: true; scenarioId: string }
  | { ok: false; error: string };

function bodyRange(min: number, max: number, team: boolean): [number, number] {
  const overhead = team ? 140 : 110;
  const low = Math.max(45, min - overhead);
  const high = Math.max(low + 30, max - 90);
  return [low, high];
}

function practiceTitle(draft: ScenarioDraft) {
  if (draft.company_name) return draft.company_name;
  const role = draft.participant_role.trim();
  return role ? role.charAt(0).toUpperCase() + role.slice(1) : "Practice event";
}

async function savePracticeScenario(selection: Selection, draft: ScenarioDraft) {
  const event = getEvent(selection.eventCode);
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("save_practice_scenario", {
    p_event_code: event.code,
    p_instructional_area_code: selection.primaryIA.code,
    p_instructional_area_name: selection.primaryIA.name,
    p_career_pathway: event.pathway,
    p_title: practiceTitle(draft),
    p_situation: situationDocument(draft, event),
    p_judge: judgeDocument(draft, event),
    p_solution: solutionDocument(draft),
    p_question_1: draft.judge_questions[0],
    p_question_2: draft.judge_questions[1],
    p_indicators: selection.pis.map((pi, index) => ({
      code: pi.code,
      text: pi.display_text,
      order: index + 1,
    })),
  });
  if (error || typeof data !== "string" || !data) {
    throw new Error(error?.message ?? "Could not save the practice event.");
  }
  revalidateTag("scenario-catalog");
  revalidateTag("scenario-filters");
  return data;
}

function cleanAvoid(values: string[] | undefined) {
  return (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 20);
}

function roleplayGenerationOpen() {
  return false;
}

export async function generatePracticeEvent(input: GenerateInput): Promise<GenerateResult> {
  await requireAuth("/generate");
  if (!roleplayGenerationOpen()) {
    return { ok: false, error: "Roleplay generation is closed." };
  }

  const eventCode = input.eventCode?.trim().toUpperCase();
  const primaryIA = input.primaryIA?.trim() || undefined;

  let event;
  try {
    event = getEvent(eventCode);
  } catch {
    return { ok: false, error: "Choose an event that has a role-play." };
  }
  if (!event.generate_roleplay) {
    return { ok: false, error: `${event.code} is exam-only and does not get a role-play.` };
  }

  const calculations = wantsCalculations(event.code, input.calculations);
  let selection;
  try {
    selection = selectPIs({ eventCode: event.code, primaryIA, seed: Math.floor(Math.random() * 0xffffffff) });
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "Could not choose performance indicators." };
  }

  const payload = writerPayload({
    event: {
      code: event.code,
      name: event.name,
      category: event.category,
      cluster: clusterName(event),
      pathway: event.pathway,
      scenario_focus: event.scenario_focus,
    },
    primaryIA: selection.primaryIA.name,
    calculations,
    wordRange: event.situation_word_range,
    bodyRange: bodyRange(event.situation_word_range[0], event.situation_word_range[1], event.category === "team_decision_making"),
    indicators: selection.pis.map((pi) => ({
      code: pi.code,
      level: pi.level,
      display_text: pi.display_text,
    })),
    avoid: cleanAvoid(input.avoid),
  });

  const prior: Array<{ draft: unknown; errors: string[] }> = [];
  let lastErrors: string[] = [];

  try {
    for (let attempt = 0; attempt < 3; attempt += 1) {
      const content = await completeJson({
        system: ROLEPLAY_WRITER_PROMPT,
        payload,
        prior,
      });

      let raw: unknown;
      try {
        raw = parseModelJson(content);
      } catch {
        lastErrors = ["Return one JSON object and no other text."];
        prior.push({ draft: content, errors: lastErrors });
        continue;
      }

      const parsed = parseDraft(raw);
      if ("errors" in parsed) {
        lastErrors = parsed.errors;
        prior.push({ draft: raw, errors: lastErrors });
        continue;
      }

      const draft = repairDraft(selection, parsed.draft, calculations);
      const problems = validateDraft(selection, draft, calculations);
      if (problems.length === 0) {
        const scenarioId = await savePracticeScenario(selection, draft);
        return { ok: true, scenarioId };
      }
      lastErrors = problems;
      prior.push({ draft: raw, errors: problems });
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not generate a practice event.";
    return { ok: false, error: message.replace(/sk-[A-Za-z0-9_-]+/g, "the API key") };
  }

  const summary = lastErrors.slice(0, 3).join(" ");
  return {
    ok: false,
    error: summary
      ? `This practice event did not pass the 2026–27 checks. ${summary}`
      : "This practice event did not pass the 2026–27 checks.",
  };
}
