"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteSubmission } from "@/app/roleplay/actions";
import { SubmissionStatusBadge } from "@/components/roleplay/SubmissionStatusBadge";
import { getScenario } from "@/lib/roleplay/scenarios";
import type { Submission } from "@/lib/roleplay/types";

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
    const scenario = getScenario(submission.scenario_key);
    const label = scenario?.title ?? submission.scenario_key;
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
      <div className="bg-white rounded-3xl border border-slate-200 p-12 text-center shadow-soft">
        <p className="text-muted">No submissions to grade yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {pending.length > 0 && (
        <section>
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
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
          <h2 className="text-sm font-semibold text-muted uppercase tracking-wide mb-3">
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
  const scenario = getScenario(submission.scenario_key);

  return (
    <div className="flex items-center gap-2 bg-white rounded-2xl border border-slate-200 hover:border-deca-green/40 hover:shadow-soft transition-all">
      <Link
        href={`/admin/grading/${submission.id}`}
        className="flex flex-1 items-center justify-between p-4 min-w-0"
      >
        <div className="min-w-0">
          <h3 className="font-medium text-ink truncate">
            {scenario?.title ?? submission.scenario_key}
          </h3>
          <p className="text-sm text-muted">
            {submission.student_name ?? "Student"} · {scenario?.event ?? "Roleplay"} ·
            Attempt #{submission.attempt_number} ·{" "}
            {new Date(submission.submitted_at).toLocaleDateString()}
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0 ml-4">
          <SubmissionStatusBadge status={submission.status} />
          <span className="text-deca-green text-sm font-medium">
            {submission.status === "reviewed" ? "View" : "Grade"} →
          </span>
        </div>
      </Link>
      <button
        type="button"
        onClick={onDelete}
        disabled={disabled}
        className="shrink-0 mr-3 p-2 text-muted hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
        title="Delete submission"
      >
        ✕
      </button>
    </div>
  );
}
