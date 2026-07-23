"use client";

import { useState } from "react";
import type { RubricScores } from "@/lib/roleplay/types";
import { getMaxScore, getTotalScore } from "@/lib/roleplay/types";
import { MAX_CENTURY_SCORE, MAX_PI_SCORE } from "@/lib/roleplay/scenarios";

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
      <h3 className="font-semibold text-slate-800">Rubric Scoring</h3>

      <div className="space-y-3">
        {piLabels.map((label, i) => {
          const key = `PI-${i + 1}`;
          const score = rubric.piScores[key] ?? 0;
          const feedback = piFeedback?.[key] ?? '';
          return (
            <div key={key} className="bg-slate-50 rounded-lg p-3 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-medium text-indigo-600">
                    PI {i + 1}
                  </span>
                  <p className="text-sm text-slate-700 mt-0.5">{label}</p>
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
                    <p className="text-sm text-slate-600 bg-white rounded-md px-3 py-2 border border-slate-100">
                      {feedback}
                    </p>
                  )
                ) : (
                  <textarea
                    value={feedback}
                    onChange={(e) => onPiFeedbackChange?.(key, e.target.value)}
                    placeholder={`Feedback for PI ${i + 1}...`}
                    rows={2}
                    className="w-full border border-slate-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white"
                  />
                )
              )}
            </div>
          );
        })}
      </div>

      <div className="bg-indigo-50 rounded-lg p-3 space-y-2">
        <div className="flex items-center justify-between gap-3">
          <div>
            <span className="text-xs font-medium text-indigo-600">
              21st Century Skills
            </span>
            <p className="text-sm text-slate-700 mt-0.5">
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
              <p className="text-sm text-slate-600 bg-white rounded-md px-3 py-2 border border-indigo-100">
                {centuryFeedback}
              </p>
            )
          ) : (
            <textarea
              value={centuryFeedback ?? ''}
              onChange={(e) => onCenturyFeedbackChange?.(e.target.value)}
              placeholder="Feedback for 21st Century Skills..."
              rows={2}
              className="w-full border border-indigo-200 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none bg-white"
            />
          )
        )}
      </div>

      <div className="flex items-center justify-between pt-3 border-t border-slate-200">
        <span className="font-semibold text-slate-800">Total Score</span>
        <span className="text-2xl font-bold text-indigo-600">
          {total} <span className="text-base font-normal text-slate-500">/ {max}</span>
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
      <span className="text-lg font-semibold text-slate-800 w-16 text-right">
        {value}
      </span>
    );
  }

  return (
    <div className="flex items-center gap-1">
      <input
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
        className="w-14 text-center border border-slate-300 rounded-md px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />
      <span className="text-xs text-slate-500">/ {max}</span>
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
