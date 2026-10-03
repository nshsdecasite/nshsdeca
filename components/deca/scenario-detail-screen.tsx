import Link from "next/link";
import { DecaButton } from "@/components/deca/button";
import { LEVEL_LABELS, type ScenarioDetail } from "@/lib/roleplay/scenario-types";
import { getTotalScore } from "@/lib/roleplay/types";
import type { Submission } from "@/lib/roleplay/types";
import { cn } from "@/lib/utils";

export function ScenarioDetailScreen({
  scenario,
  attempts,
  canSubmit,
}: {
  scenario: ScenarioDetail;
  attempts: Submission[];
  canSubmit: boolean;
}) {
  const title =
    scenario.scenario_title?.trim() ||
    `${scenario.event_code} scenario ${scenario.scenario_number}`;
  const nextAttempt = (attempts[0]?.attempt_number ?? 0) + 1;

  return (
    <div className="px-9 py-9">
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
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-extrabold text-mute shadow-card">
              10 MIN PREP
            </span>
            <span className="rounded-full bg-white px-3 py-1 text-[11px] font-extrabold text-mute shadow-card">
              10 MIN WITH THE JUDGE
            </span>
          </div>
        </div>
        <div className="flex gap-2.5">
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
        <div className="deca-card px-[38px] py-[34px]">
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em]">
            The situation
          </h2>
          <p className="mt-4 max-w-[62ch] whitespace-pre-wrap text-base leading-[1.7]">
            {scenario.situation_description ?? "No situation text available."}
          </p>
          {scenario.judge_characterization ? (
            <p className="mt-3.5 max-w-[62ch] whitespace-pre-wrap text-base leading-[1.7]">
              {scenario.judge_characterization}
            </p>
          ) : null}
          {scenario.solution_text ? (
            <div className="mt-6 rounded-2xl bg-ever-lt px-6 py-5">
              <p className="text-xs font-extrabold tracking-[0.1em] uppercase text-ever-dk">
                Your task
              </p>
              <p className="mt-2.5 whitespace-pre-wrap text-[15px] leading-[1.65]">
                {scenario.solution_text}
              </p>
            </div>
          ) : null}
        </div>

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
            <div className="flex flex-1 flex-col gap-[18px] rounded-[20px] bg-ever-dk p-[26px] text-white">
              <p className="m-0 font-display text-[19px] font-extrabold leading-[1.3] tracking-[-0.02em]">
                Ready? Open the full case, then record your attempt.
              </p>
              <DecaButton
                href={`/roleplays/submit?scenario=${scenario.id}`}
                variant="white"
                className="mt-auto self-start"
              >
                Start 10-minute prep
              </DecaButton>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
