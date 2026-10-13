"use client";

import { useState, useTransition } from "react";
import { saveScenarioAnswer } from "@/app/roleplay/scenario-actions";

export function JudgeQuestions({
  scenarioId,
  questions,
  initialAnswers,
}: {
  scenarioId: string;
  questions: string[];
  initialAnswers: Record<number, string>;
}) {
  const [open, setOpen] = useState<Record<number, boolean>>({});
  const [answers, setAnswers] = useState(initialAnswers);
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [, startTransition] = useTransition();

  if (!questions.length) return null;

  function persist(number: number, value: string) {
    startTransition(async () => {
      try {
        await saveScenarioAnswer(scenarioId, number, value);
        setSaved((current) => ({ ...current, [number]: true }));
      } catch {
        setSaved((current) => ({ ...current, [number]: false }));
      }
    });
  }

  return (
    <div className="deca-card px-[26px] py-6">
      <h2 className="font-display text-[17px] font-extrabold tracking-[-0.02em]">
        Judge questions
      </h2>
      <div className="mt-4 flex flex-wrap gap-2">
        {questions.map((question, index) => {
          const number = index + 1;
          const shown = Boolean(open[number]);
          return (
            <button
              key={number}
              type="button"
              aria-expanded={shown}
              onClick={() => setOpen((current) => ({ ...current, [number]: !current[number] }))}
              className="rounded-full bg-ever-lt px-3 py-1.5 text-[13px] font-bold text-ever-dk hover:bg-[#e3e9d8]"
            >
              {shown ? `Hide question ${number}` : `Show question ${number}`}
            </button>
          );
        })}
      </div>
      <div className="mt-4 flex flex-col gap-4">
        {questions.map((question, index) => {
          const number = index + 1;
          if (!open[number]) return null;
          return (
            <div key={number}>
              <p className="text-sm leading-6 text-pretty text-ink">{question}</p>
              <textarea
                value={answers[number] ?? ""}
                rows={4}
                placeholder="Write your answer"
                onChange={(event) => {
                  const value = event.target.value;
                  setAnswers((current) => ({ ...current, [number]: value }));
                  setSaved((current) => ({ ...current, [number]: false }));
                }}
                onBlur={(event) => persist(number, event.target.value)}
                className="mt-2 w-full resize-y rounded-2xl bg-[#f6f5ef] px-3.5 py-3 text-sm leading-6 text-ink outline-none focus-visible:ring-2 focus-visible:ring-ever-dk/30"
              />
              {saved[number] ? <p className="mt-1.5 text-xs text-mute">Saved</p> : null}
            </div>
          );
        })}
      </div>
    </div>
  );
}
