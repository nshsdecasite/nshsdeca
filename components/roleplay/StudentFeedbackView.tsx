"use client";

import Link from "next/link";
import { useState } from "react";
import RubricForm from "@/components/roleplay/RubricForm";
import VideoPlayer from "@/components/roleplay/VideoPlayer";
import { SubmissionStatusBadge } from "@/components/roleplay/SubmissionStatusBadge";
import { resolveVideoSource } from "@/lib/roleplay/submission";
import { getScenario } from "@/lib/roleplay/scenarios";
import type { Scenario } from "@/lib/roleplay/types";
import {
  COMMENT_TAG_LABELS,
  formatTime,
  getMaxScore,
  getTotalScore,
  type Submission,
  type TimestampedComment,
} from "@/lib/roleplay/types";

export function StudentFeedbackView({
  submission,
  scenario,
}: {
  submission: Submission;
  scenario: Scenario;
}) {
  const [activeComment, setActiveComment] = useState<TimestampedComment | null>(
    null,
  );
  const grading = submission.grading_data;
  const isReviewed = submission.status === "reviewed" && grading;
  const videoSource = resolveVideoSource(submission);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/submissions"
            className="text-sm text-deca-green hover:underline"
          >
            ← Back to submissions
          </Link>
          <h1 className="text-2xl font-bold text-ink mt-2">{scenario.title}</h1>
          <p className="text-muted">
            {scenario.event} · Attempt #{submission.attempt_number}
          </p>
        </div>
        <SubmissionStatusBadge status={submission.status} />
      </div>

      <div className="grid lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3">
          <VideoPlayer
            videoUrl={submission.video_url}
            videoSource={videoSource}
            comments={grading?.comments ?? []}
            manualDuration={grading?.videoDuration}
            activeCommentId={activeComment?.id}
            onCommentClick={setActiveComment}
            onActiveCommentChange={
              videoSource === "youtube" ? setActiveComment : undefined
            }
          />
        </div>

        <div className="lg:col-span-2 space-y-4">
          {!isReviewed ? (
            <div className="bg-white rounded-2xl border border-slate-200 p-6 text-center shadow-soft">
              <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3">
                <span className="text-2xl">⏳</span>
              </div>
              <h3 className="font-medium text-ink">
                {submission.status === "submitted"
                  ? "Awaiting review"
                  : "Under review"}
              </h3>
              <p className="text-sm text-muted mt-1">
                An officer will review your submission and provide feedback
                soon.
              </p>
            </div>
          ) : (
            <>
              <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-soft">
                <div className="text-center mb-4">
                  <span className="text-4xl font-bold text-deca-green">
                    {getTotalScore(grading.rubric)}
                  </span>
                  <span className="text-lg text-muted">
                    {" "}
                    / {getMaxScore(grading.rubric)}
                  </span>
                </div>
                <RubricForm
                  rubric={grading.rubric}
                  piLabels={scenario.pis}
                  onChange={() => {}}
                  piFeedback={grading.piFeedback}
                  centuryFeedback={grading.centuryFeedback}
                  readOnly
                />
              </div>

              {(grading.comments?.length ?? 0) > 0 && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-soft">
                  <h3 className="font-semibold text-ink mb-1">
                    Video timestamp feedback
                  </h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {grading.comments.map((comment) => (
                      <button
                        key={comment.id}
                        type="button"
                        onClick={() => setActiveComment(comment)}
                        className={`w-full text-left p-2 rounded-lg transition-colors ${
                          activeComment?.id === comment.id
                            ? "bg-amber-50 border border-amber-200"
                            : "hover:bg-slate-50 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-xs font-mono text-deca-green">
                            {formatTime(comment.timestamp)}
                          </span>
                          <span className="text-xs bg-slate-100 text-muted px-1.5 py-0.5 rounded">
                            {COMMENT_TAG_LABELS[comment.tag]}
                          </span>
                        </div>
                        <p className="text-sm text-ink">{comment.text}</p>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {grading.overallFeedback && (
                <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-soft">
                  <h3 className="font-semibold text-ink mb-2">
                    Overall feedback
                  </h3>
                  <p className="text-sm text-muted whitespace-pre-wrap">
                    {grading.overallFeedback}
                  </p>
                  <p className="text-xs text-muted mt-2">
                    — {grading.officerName}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
