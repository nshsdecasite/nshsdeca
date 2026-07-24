import Link from "next/link";
import { SubmissionStatusBadge } from "@/components/roleplay/SubmissionStatusBadge";
import { submissionScenarioTitle } from "@/lib/roleplay/scenario-display";
import {
  getMaxScore,
  getTotalScore,
  type Submission,
} from "@/lib/roleplay/types";
import { Card } from "@/components/ui/card";

export function StudentHistoryList({
  submissions,
}: {
  submissions: Submission[];
}) {
  if (submissions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="mb-4 text-muted-foreground">No submissions yet.</p>
        <Link
          href="/roleplays/submit"
          className="text-sm font-medium text-primary hover:underline"
        >
          Submit your first roleplay
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      {submissions.map((submission) => {
        const grading = submission.grading_data;
        const score =
          grading && submission.status === "reviewed"
            ? `${getTotalScore(grading.rubric)} / ${getMaxScore(grading.rubric)}`
            : "—";

        return (
          <Link key={submission.id} href={`/submissions/${submission.id}`} className="block">
            <Card className="p-4 transition-all hover:shadow-border-hover">
              <div className="flex items-center justify-between gap-4">
                <div className="min-w-0">
                  <h3 className="truncate font-medium text-foreground">
                    {submissionScenarioTitle(submission)}
                  </h3>
                  <p className="text-sm text-muted-foreground">
                    {submission.event_name ?? "Roleplay"} · Attempt #
                    {submission.attempt_number} ·{" "}
                    {new Date(submission.submitted_at).toLocaleDateString()}
                  </p>
                </div>
                <div className="flex shrink-0 items-center gap-3">
                  <span className="text-sm font-medium text-foreground">{score}</span>
                  <SubmissionStatusBadge status={submission.status} />
                </div>
              </div>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
