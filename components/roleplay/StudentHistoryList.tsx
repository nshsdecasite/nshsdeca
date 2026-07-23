import Link from "next/link";
import { SubmissionStatusBadge } from "@/components/roleplay/SubmissionStatusBadge";
import { getScenario } from "@/lib/roleplay/scenarios";
import {
  getMaxScore,
  getTotalScore,
  type Submission,
} from "@/lib/roleplay/types";

export function StudentHistoryList({
  submissions,
}: {
  submissions: Submission[];
}) {
  if (submissions.length === 0) {
    return (
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-soft">
        <p className="text-muted mb-4">No submissions yet.</p>
        <Link
          href="/roleplays/submit"
          className="text-deca-green hover:underline text-sm font-medium"
        >
          Submit your first roleplay
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => {
        const scenario = getScenario(submission.scenario_key);
        const grading = submission.grading_data;
        const score =
          grading && submission.status === "reviewed"
            ? `${getTotalScore(grading.rubric)} / ${getMaxScore(grading.rubric)}`
            : "—";

        return (
          <Link
            key={submission.id}
            href={`/submissions/${submission.id}`}
            className="block bg-white rounded-2xl border border-slate-200 p-4 hover:border-deca-green/40 hover:shadow-soft transition-all"
          >
            <div className="flex items-center justify-between gap-4">
              <div className="min-w-0">
                <h3 className="font-medium text-ink truncate">
                  {scenario?.title ?? submission.scenario_key}
                </h3>
                <p className="text-sm text-muted">
                  {scenario?.event ?? "Roleplay"} · Attempt #
                  {submission.attempt_number} ·{" "}
                  {new Date(submission.submitted_at).toLocaleDateString()}
                </p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <span className="text-sm font-medium text-ink">{score}</span>
                <SubmissionStatusBadge status={submission.status} />
              </div>
            </div>
          </Link>
        );
      })}
    </div>
  );
}
