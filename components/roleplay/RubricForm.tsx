"use client";

import { useState } from "react";
import type { RubricScores } from "@/lib/roleplay/types";
import { getMaxScore, getTotalScore } from "@/lib/roleplay/types";
import { MAX_CENTURY_SCORE, MAX_PI_SCORE } from "@/lib/roleplay/scenarios";
import { Input } from "@/components/ui/input";

interface RubricFormProps {
  rubric: RubricScores;
  piLabels: string[];
  onChange: (rubric: RubricScores) => void;
  piFeedback?: Record<string, string>;
  onPiFeedbackChange?: (key: string, value: string) => void;
  centuryFeedback?: string;
  onCenturyFeedbackChange?: (value: string) => void;
  readOnly?: boolean;
}

export default function RubricForm({
  rubric,
  piLabels,
  onChange,
  piFeedback,
  onPiFeedbackChange,
  centuryFeedback,
  onCenturyFeedbackChange,
  readOnly = false,
}: RubricFormProps) {
  const updatePiScore = (index: number, score: number) => {
    const key = `PI-${index + 1}`;
    onChange({
      ...rubric,
      piScores: { ...rubric.piScores, [key]: score },
    });
  };

  const updateCenturyScore = (score: number) => {
    onChange({ ...rubric, centurySkills: score });
  };

  const total = getTotalScore(rubric);
  const max = getMaxScore(rubric);

  return (
    <div className="space-y-4">
      <h3 className="font-semibold text-foreground">Rubric Scoring</h3>

      <div className="space-y-3">
        {piLabels.map((label, i) => {
          const key = `PI-${i + 1}`;
          const score = rubric.piScores[key] ?? 0;
          const feedback = piFeedback?.[key] ?? '';
          return (
            <div key={key} className="space-y-2 rounded-2xl bg-muted p-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <span className="text-xs font-medium text-primary">
                    PI {i + 1}
                  </span>
                  <p className="mt-0.5 text-sm text-foreground">{label}</p>
                </div>
                <ScoreInput
                  value={score}
                  max={rubric.maxPiScore}
                  onChange={(v) => updatePiScore(i, v)}
                  readOnly={readOnly}
                />
              </div>
              {(onPiFeedbackChange || (readOnly && feedback)) && (
                readOnly ? (
                  feedback && (
                    <p className="rounded-xl border border-border/60 bg-card px-3 py-2 text-sm text-muted-foreground">
                      {feedback}
                    </p>
                  )
                ) : (
                  <textarea
                    value={feedback}
                    onChange={(e) => onPiFeedbackChange?.(key, e.target.value)}
                    placeholder={`Feedback for PI ${i + 1}...`}
                    rows={2}
                    className="w-full resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground shadow-border outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                  />
                )
              )}
            </div>
          );
        })}
      </div>

      <div className="space-y-2 rounded-2xl bg-primary/10 p-3">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-primary">
              21st Century Skills
            </span>
            <p className="mt-0.5 text-sm text-foreground">
              Communication, collaboration, critical thinking, creativity
            </p>
          </div>
          <ScoreInput
            value={rubric.centurySkills}
            max={rubric.maxCenturyScore}
            onChange={updateCenturyScore}
            readOnly={readOnly}
          />
        </div>
        {(onCenturyFeedbackChange || (readOnly && centuryFeedback)) && (
          readOnly ? (
            centuryFeedback && (
              <p className="rounded-xl border border-primary/20 bg-card px-3 py-2 text-sm text-muted-foreground">
                {centuryFeedback}
              </p>
            )
          ) : (
            <textarea
              value={centuryFeedback ?? ''}
              onChange={(e) => onCenturyFeedbackChange?.(e.target.value)}
              placeholder="Feedback for 21st Century Skills..."
              rows={2}
              className="w-full resize-none rounded-xl border border-primary/20 bg-card px-3 py-2 text-sm text-foreground shadow-border outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          )
        )}
      </div>

      <div className="flex items-center justify-between border-t border-border pt-3">
        <span className="font-semibold text-foreground">Total Score</span>
        <span className="text-2xl font-semibold text-primary">
          {total} <span className="text-base font-normal text-muted-foreground">/ {max}</span>
        </span>
      </div>
    </div>
  );
}

function ScoreInput({
  value,
  max,
  onChange,
  readOnly,
}: {
  value: number;
  max: number;
  onChange: (v: number) => void;
  readOnly?: boolean;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const display = draft ?? String(value);

  if (readOnly) {
    return (
      <span className="w-16 text-right text-lg font-semibold text-foreground">
        {value}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <Input
        type="number"
        min={0}
        max={max}
        value={display}
        onChange={(e) => {
          setDraft(e.target.value);
          const n = Number(e.target.value);
          if (e.target.value !== '' && !Number.isNaN(n)) {
            onChange(Math.min(max, Math.max(0, n)));
          }
        }}
        onBlur={() => setDraft(null)}
        className="h-9 w-14 min-h-0 px-2 py-1 text-center text-sm"
      />
      <span className="text-xs text-muted-foreground">/ {max}</span>
    </div>
  );
}

export function createEmptyRubric(piCount: number): RubricScores {
  const piScores: Record<string, number> = {};
  for (let i = 1; i <= piCount; i++) {
    piScores[`PI-${i}`] = 0;
  }
  return {
    piScores,
    centurySkills: 0,
    maxPiScore: MAX_PI_SCORE,
    maxCenturyScore: MAX_CENTURY_SCORE,
  };
}
