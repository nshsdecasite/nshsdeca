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
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

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
            className="text-sm text-primary hover:underline"
          >
            ← Back to submissions
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{scenario.title}</h1>
          <p className="text-muted-foreground">
            {scenario.event} · Attempt #{submission.attempt_number}
          </p>
        </div>
        <SubmissionStatusBadge status={submission.status} />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
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

        <div className="space-y-4 lg:col-span-2">
          {!isReviewed ? (
            <Card className="p-6 text-center">
              <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-muted">
                <span className="text-2xl">⏳</span>
              </div>
              <h3 className="font-medium text-foreground">
                {submission.status === "submitted"
                  ? "Awaiting review"
                  : "Under review"}
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                An officer will review your submission and provide feedback
                soon.
              </p>
            </Card>
          ) : (
            <>
              <Card className="p-4">
                <div className="mb-4 text-center">
                  <span className="text-4xl font-bold text-primary">
                    {getTotalScore(grading.rubric)}
                  </span>
                  <span className="text-lg text-muted-foreground">
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
              </Card>

              {(grading.comments?.length ?? 0) > 0 && (
                <Card className="p-4">
                  <h3 className="mb-1 font-semibold text-foreground">
                    Video timestamp feedback
                  </h3>
                  <div className="max-h-48 space-y-2 overflow-y-auto">
                    {grading.comments.map((comment) => (
                      <button
                        key={comment.id}
                        type="button"
                        onClick={() => setActiveComment(comment)}
                        className={cn(
                          "w-full rounded-lg p-2 text-left transition-colors",
                          activeComment?.id === comment.id
                            ? "border border-amber-200 bg-amber-50"
                            : "border border-transparent hover:bg-muted",
                        )}
                      >
                        <div className="mb-0.5 flex items-center gap-2">
                          <span className="font-mono text-xs text-primary">
                            {formatTime(comment.timestamp)}
                          </span>
                          <Badge variant="muted" className="normal-case">
                            {COMMENT_TAG_LABELS[comment.tag]}
                          </Badge>
                        </div>
                        <p className="text-sm text-foreground">{comment.text}</p>
                      </button>
                    ))}
                  </div>
                </Card>
              )}

              {grading.overallFeedback && (
                <Card className="p-4">
                  <h3 className="mb-2 font-semibold text-foreground">
                    Overall feedback
                  </h3>
                  <p className="whitespace-pre-wrap text-sm text-muted-foreground">
                    {grading.overallFeedback}
                  </p>
                  <p className="mt-2 text-xs text-muted-foreground">
                    — {grading.officerName}
                  </p>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
