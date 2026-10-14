import Link from "next/link";
import { DecaButton } from "@/components/deca/button";
import { JudgeQuestions } from "@/components/deca/judge-questions";
import { PracticeReviewActions } from "@/components/deca/practice-review-actions";
import { ScenarioCase } from "@/components/deca/scenario-case";
import { LEVEL_LABELS, type ScenarioDetail } from "@/lib/roleplay/scenario-types";
import { getTotalScore } from "@/lib/roleplay/types";
import type { Submission } from "@/lib/roleplay/types";
import { cn } from "@/lib/utils";

export function ScenarioDetailScreen({
  scenario,
  attempts,
  canSubmit,
  viewerIsOfficer = false,
}: {
  scenario: ScenarioDetail;
  attempts: Submission[];
  canSubmit: boolean;
  viewerIsOfficer?: boolean;
}) {
  const title =
    scenario.scenario_title?.trim() ||
    `${scenario.event_code} scenario ${scenario.scenario_number}`;
  const nextAttempt = (attempts[0]?.attempt_number ?? 0) + 1;

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <Link href="/roleplays" className="text-[13px] font-bold text-ever-dk hover:text-ever">
            ← Scenario library
          </Link>
          <h1 className="mt-3.5 font-display text-4xl font-black tracking-[-0.035em]">
            {title}
          </h1>
          <div className="mt-3.5 flex flex-wrap gap-2">
            <span className="rounded-full bg-ever-lt px-3 py-1 text-[11px] font-extrabold text-ever-dk">
              {scenario.event_code}
            </span>
            <span className="rounded-full bg-ever-lt px-3 py-1 text-[11px] font-extrabold text-ever-dk">
              {scenario.year} · {LEVEL_LABELS[scenario.level].toUpperCase()}
            </span>
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-end gap-2.5">
          {scenario.level === "practice" ? (
            <PracticeReviewActions
              scenarioId={scenario.id}
              isOwner={Boolean(scenario.is_owner)}
              reviewStatus={scenario.review_status}
              creatorName={scenario.creator_name}
              viewerIsOfficer={viewerIsOfficer}
            />
          ) : null}
          {scenario.source_url ? (
            <a
              href={scenario.source_url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center justify-center rounded-full bg-white px-[22px] py-[13px] text-sm font-bold text-ever-dk shadow-card hover:bg-ever-lt hover:text-ever-dk"
            >
              Download PDF
            </a>
          ) : null}
          {canSubmit ? (
            <DecaButton href={`/roleplays/submit?scenario=${scenario.id}`}>
              Record attempt {nextAttempt}
            </DecaButton>
          ) : null}
        </div>
      </div>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
        <ScenarioCase
          scenarioId={scenario.id}
          situation={scenario.situation_description}
          solution={scenario.solution_text}
          hasAttempt={attempts.length > 0}
        />

        <div className="flex flex-col gap-4">
          <div className="deca-card px-[26px] py-6">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-[17px] font-extrabold tracking-[-0.02em]">
                Performance indicators
              </h2>
            </div>
            <div className="flex flex-col gap-3">
              {(scenario.pis ?? []).length ? (
                (scenario.pis ?? []).map((pi) => (
                  <div key={`${pi.pi_code}-${pi.display_order}`} className="text-[13px] leading-[1.4]">
                    <strong className="text-ever-dk">{pi.pi_code ?? "PI"}</strong>
                    {" · "}
                    {pi.indicator_text}
                  </div>
                ))
              ) : (
                <p className="text-[13px] text-mute">No indicators listed for this scenario.</p>
              )}
            </div>
          </div>

          <JudgeQuestions
            questions={scenario.judge_questions}
            hasAttempt={attempts.length > 0}
          />

          <div className="deca-card px-[26px] py-6">
            <h2 className="mb-3.5 font-display text-[17px] font-extrabold tracking-[-0.02em]">
              Your attempts
            </h2>
            {attempts.length === 0 ? (
              <p className="text-[13px] text-mute">No attempts yet.</p>
            ) : (
              <div className="flex flex-col gap-3">
                {attempts.map((item) => {
                  const total = item.grading_data
                    ? getTotalScore(item.grading_data.rubric)
                    : null;
                  return (
                    <Link
                      key={item.id}
                      href={`/submissions/${item.id}`}
                      className="flex items-center justify-between gap-2.5 text-ink hover:text-ink"
                    >
                      <div>
                        <p className="m-0 text-[13px] font-bold">
                          Attempt {item.attempt_number}
                        </p>
                        <p className="mt-[3px] text-xs text-mute">
                          {new Date(item.submitted_at).toLocaleDateString("en-US", {
                            month: "short",
                            day: "numeric",
                          })}
                          {item.status === "reviewed" ? " · graded" : ""}
                        </p>
                      </div>
                      {item.status === "reviewed" && total != null ? (
                        <span className="text-sm font-extrabold">
                          {total}
                          <span className="text-xs text-mute">/100</span>
                        </span>
                      ) : (
                        <span
                          className={cn(
                            "rounded-full px-3 py-1 text-[11px] font-extrabold",
                            item.status === "under_review"
                              ? "bg-ever-lt text-ever-dk"
                              : "bg-ground text-mute",
                          )}
                        >
                          {item.status === "under_review" ? "IN REVIEW" : "QUEUED"}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            )}
          </div>

          {canSubmit ? (
            <div className="w-fit max-w-full rounded-[20px] bg-ever-dk px-5 py-4 text-white">
              <p className="m-0 text-pretty font-display text-[17px] font-extrabold leading-[1.3] tracking-[-0.02em]">
                Ready? Record your attempt.
              </p>
              <DecaButton
                href={`/roleplays/submit?scenario=${scenario.id}`}
                variant="white"
                size="sm"
                className="mt-3"
              >
                Record your attempt
              </DecaButton>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
