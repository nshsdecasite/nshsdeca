"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSubmission } from "@/app/roleplay/actions";
import { SubmissionStatusBadge } from "@/components/roleplay/SubmissionStatusBadge";
import { submissionScenarioTitle } from "@/lib/roleplay/scenario-display";
import type { Submission } from "@/lib/roleplay/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

export function OfficerQueueList({
  submissions,
}: {
  submissions: Submission[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const pending = submissions.filter((submission) => submission.status !== "reviewed");
  const completed = submissions.filter((submission) => submission.status === "reviewed");

  const handleDelete = (submission: Submission) => {
    const label = submissionScenarioTitle(submission);
    if (
      !window.confirm(
        `Delete submission "${label}" (Attempt #${submission.attempt_number})? This cannot be undone.`,
      )
    ) {
      return;
    }

    startTransition(async () => {
      await deleteSubmission(submission.id);
      router.refresh();
    });
  };

  if (submissions.length === 0) {
    return (
      <Card className="p-12 text-center">
        <p className="text-muted-foreground">No submissions to grade yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Pending ({pending.length})
          </h2>
          <div className="space-y-2">
            {pending.map((submission) => (
              <SubmissionRow
                key={submission.id}
                submission={submission}
                onDelete={() => handleDelete(submission)}
                disabled={isPending}
              />
            ))}
          </div>
        </section>
      )}

      {completed.length > 0 && (
        <section>
          <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Completed ({completed.length})
          </h2>
          <div className="space-y-2">
            {completed.map((submission) => (
              <SubmissionRow
                key={submission.id}
                submission={submission}
                onDelete={() => handleDelete(submission)}
                disabled={isPending}
              />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function SubmissionRow({
  submission,
  onDelete,
  disabled,
}: {
  submission: Submission;
  onDelete: () => void;
  disabled: boolean;
}) {
  return (
    <Card className="flex items-center gap-2 p-0 transition-[box-shadow] duration-150 ease-out hover:shadow-border-hover">
      <Link
        href={`/admin/grading/${submission.id}`}
        className="flex min-w-0 flex-1 items-center justify-between p-4"
      >
        <div className="min-w-0">
          <h3 className="truncate font-medium text-foreground">
            {submissionScenarioTitle(submission)}
          </h3>
          <p className="text-sm text-muted-foreground">
            {submission.student_name ?? "Student"} · {submission.event_name ?? "Roleplay"} ·
            Attempt #{submission.attempt_number} ·{" "}
            {new Date(submission.submitted_at).toLocaleDateString()}
          </p>
        </div>
        <div className="ml-4 flex shrink-0 items-center gap-3">
          <SubmissionStatusBadge status={submission.status} />
          <span className="text-sm font-medium text-primary">
            {submission.status === "reviewed" ? "View" : "Grade"} →
          </span>
        </div>
      </Link>
      <Button
        type="button"
        variant="ghost"
        size="icon"
        onClick={onDelete}
        disabled={disabled}
        title="Delete submission"
        className={cn("mr-3 shrink-0 text-muted-foreground hover:text-destructive")}
      >
        ✕
      </Button>
    </Card>
  );
}
