"use server";

import { requireAuth } from "@/lib/auth/roles";
import { clusterName, getEvent } from "@/lib/roleplay-gen/catalog";
import { parseDraft, parseModelJson } from "@/lib/roleplay-gen/draft";
import { repairDraft } from "@/lib/roleplay-gen/repair";
import { completeJson } from "@/lib/roleplay-gen/openai";
import { ROLEPLAY_WRITER_PROMPT, writerPayload } from "@/lib/roleplay-gen/prompt";
import { renderPacket, wantsCalculations } from "@/lib/roleplay-gen/render";
import { selectPIs } from "@/lib/roleplay-gen/select";
import type { GenerateInput, PracticePacket } from "@/lib/roleplay-gen/types";
import { validateDraft } from "@/lib/roleplay-gen/validate";

export type GenerateResult =
  | { ok: true; packet: PracticePacket }
  | { ok: false; error: string };

function bodyRange(min: number, max: number, team: boolean): [number, number] {
  const overhead = team ? 140 : 110;
  const low = Math.max(45, min - overhead);
  const high = Math.max(low + 30, max - 90);
  return [low, high];
}

function cleanAvoid(values: string[] | undefined) {
  return (values ?? [])
    .map((value) => value.trim())
    .filter(Boolean)
    .slice(0, 20);
}

export async function generatePracticeEvent(input: GenerateInput): Promise<GenerateResult> {
  await requireAuth("/generate");

  const eventCode = input.eventCode?.trim().toUpperCase();
  const difficulty = input.difficulty === "advanced" ? "advanced" : "standard";
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
    difficulty,
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
        return { ok: true, packet: renderPacket(selection, draft, calculations) };
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
