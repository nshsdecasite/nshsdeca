"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  deleteSubmission,
  saveGradingDraft,
  submitFinalGrading,
} from "@/app/roleplay/actions";
import RubricForm, { createEmptyRubric } from "@/components/roleplay/RubricForm";
import VideoPlayer, { DriveDurationInput } from "@/components/roleplay/VideoPlayer";
import { resolveVideoSource } from "@/lib/roleplay/submission";
import type { Scenario } from "@/lib/roleplay/types";
import {
  COMMENT_TAG_LABELS,
  createEmptyPiFeedback,
  formatTime,
  type CommentTag,
  type Grading,
  type RubricScores,
  type Submission,
  type TimestampedComment,
} from "@/lib/roleplay/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

const AUTO_SAVE_DELAY = 1500;

function ActiveCommentPanel({
  comment,
  onDelete,
  canDelete,
}: {
  comment: TimestampedComment | null;
  onDelete?: () => void;
  canDelete?: boolean;
}) {
  if (!comment) {
    return (
      <Card className="flex min-h-[200px] flex-col items-center justify-center p-6 text-center">
        <span className="mb-2 text-3xl">💬</span>
        <p className="text-sm text-muted-foreground">
          Timestamped comments appear here during playback, or when you click a
          marker on the timeline.
        </p>
      </Card>
    );
  }

  return (
    <Card className="border-amber-200 bg-amber-50 p-4">
      <div className="mb-2 flex items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className="font-mono text-sm font-medium text-amber-700">
            {formatTime(comment.timestamp)}
          </span>
          <Badge className="bg-amber-200 text-amber-800">
            {COMMENT_TAG_LABELS[comment.tag]}
          </Badge>
        </div>
        {canDelete && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-sm text-muted-foreground hover:text-destructive"
            title="Delete comment"
          >
            ×
          </button>
        )}
      </div>
      <p className="text-sm leading-relaxed text-foreground">{comment.text}</p>
    </Card>
  );
}

export function OfficerGradingWorkspace({
  submission,
  scenario,
  officerName,
}: {
  submission: Submission;
  scenario: Scenario;
  officerName: string;
}) {
  const router = useRouter();
  const [comments, setComments] = useState<TimestampedComment[]>([]);
  const [rubric, setRubric] = useState<RubricScores | null>(null);
  const [piFeedback, setPiFeedback] = useState<Record<string, string>>({});
  const [centuryFeedback, setCenturyFeedback] = useState("");
  const [overallFeedback, setOverallFeedback] = useState("");
  const [videoDuration, setVideoDuration] = useState<number | undefined>();
  const [activeComment, setActiveComment] = useState<TimestampedComment | null>(
    null,
  );
  const [showCommentForm, setShowCommentForm] = useState(false);
  const [pendingTimestamp, setPendingTimestamp] = useState(0);
  const [newCommentText, setNewCommentText] = useState("");
  const [newCommentTag, setNewCommentTag] = useState<CommentTag>("general");
  const [saveStatus, setSaveStatus] = useState<"saved" | "saving" | "idle">(
    "idle",
  );
  const [submitted, setSubmitted] = useState(submission.status === "reviewed");
  const [isPending, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finalizedRef = useRef(submission.status === "reviewed");

  useEffect(() => {
    const grading = submission.grading_data;
    if (grading) {
      setComments(grading.comments ?? []);
      setRubric(grading.rubric);
      setPiFeedback(grading.piFeedback ?? createEmptyPiFeedback(scenario.pis.length));
      setCenturyFeedback(grading.centuryFeedback ?? "");
      setOverallFeedback(grading.overallFeedback ?? "");
      setVideoDuration(grading.videoDuration);
    } else {
      setRubric(createEmptyRubric(scenario.pis.length));
      setPiFeedback(createEmptyPiFeedback(scenario.pis.length));
    }
    setSubmitted(submission.status === "reviewed");
    finalizedRef.current = submission.status === "reviewed";
  }, [submission, scenario.pis.length]);

  const buildGrading = useCallback(
    (): Grading => ({
      comments,
      rubric: rubric!,
      piFeedback,
      centuryFeedback,
      overallFeedback,
      videoDuration,
      officerName,
    }),
    [
      comments,
      rubric,
      piFeedback,
      centuryFeedback,
      overallFeedback,
      videoDuration,
      officerName,
    ],
  );

  const autoSave = useCallback(
    (grading: Grading) => {
      if (submitted || finalizedRef.current) return;
      setSaveStatus("saving");
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        if (finalizedRef.current) return;
        startTransition(async () => {
          await saveGradingDraft(submission.id, grading);
          if (finalizedRef.current) return;
          setSaveStatus("saved");
          setTimeout(() => setSaveStatus("idle"), 2000);
        });
      }, AUTO_SAVE_DELAY);
    },
    [submission.id, submitted],
  );

  useEffect(() => {
    if (!rubric || submitted) return;
    autoSave(buildGrading());
  }, [comments, rubric, piFeedback, centuryFeedback, overallFeedback, videoDuration, autoSave, submitted, buildGrading]);

  const handleTimelineClick = (time: number) => {
    if (submitted) return;
    const isDrive = resolveVideoSource(submission) === "google-drive";
    if (isDrive && !videoDuration) return;
    setPendingTimestamp(time);
    setShowCommentForm(true);
    setNewCommentText("");
    setNewCommentTag("general");
  };

  const addComment = () => {
    if (!newCommentText.trim()) return;
    const comment: TimestampedComment = {
      id: `cmt-${Date.now()}`,
      timestamp: pendingTimestamp,
      text: newCommentText.trim(),
      tag: newCommentTag,
    };
    setComments((prev) =>
      [...prev, comment].sort((a, b) => a.timestamp - b.timestamp),
    );
    setShowCommentForm(false);
    setActiveComment(comment);
  };

  const deleteComment = (commentId: string) => {
    setComments((prev) => prev.filter((comment) => comment.id !== commentId));
    if (activeComment?.id === commentId) setActiveComment(null);
  };

  const handleSubmitGrading = () => {
    if (!rubric) return;
    clearTimeout(saveTimer.current);
    finalizedRef.current = true;
    setSubmitted(true);
    startTransition(async () => {
      try {
        await submitFinalGrading(submission.id, buildGrading());
        router.push("/admin/grading");
        router.refresh();
      } catch (error) {
        finalizedRef.current = submission.status === "reviewed";
        setSubmitted(submission.status === "reviewed");
        console.error(error);
        window.alert(
          error instanceof Error
            ? error.message
            : "Could not submit final grade. Please try again.",
        );
      }
    });
  };

  const handleDeleteSubmission = () => {
    if (
      !window.confirm(
        `Delete this submission (Attempt #${submission.attempt_number})? This cannot be undone.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      await deleteSubmission(submission.id);
    });
  };

  if (!rubric) return null;

  const tagOptions: CommentTag[] = [
    ...scenario.pis.map((_, index) => `PI-${index + 1}` as CommentTag),
    "21st-century",
    "general",
  ];
  const videoSource = resolveVideoSource(submission);
  const isDrive = videoSource === "google-drive";

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link href="/admin/grading" className="text-sm text-primary hover:underline">
            ← Back to queue
          </Link>
          <h1 className="mt-2 text-2xl font-bold text-foreground">{scenario.title}</h1>
          <p className="text-muted-foreground">
            {submission.student_name ?? "Student"} · {scenario.event} · Attempt #
            {submission.attempt_number}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === "saving" && (
            <span className="text-xs text-muted-foreground">Saving...</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-primary">Saved</span>
          )}
          {submitted && <Badge variant="success">Submitted</Badge>}
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={handleDeleteSubmission}
            disabled={isPending}
            className="text-destructive hover:text-destructive"
          >
            Delete
          </Button>
        </div>
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <VideoPlayer
            videoUrl={submission.video_url}
            videoSource={videoSource}
            comments={comments}
            manualDuration={videoDuration}
            onManualDurationChange={!submitted && isDrive ? setVideoDuration : undefined}
            showDurationInput={false}
            onTimelineClick={handleTimelineClick}
            interactive={!submitted}
            activeCommentId={activeComment?.id}
            onCommentClick={setActiveComment}
            onActiveCommentChange={setActiveComment}
            externalComments
          />

          {isDrive && !submitted && (
            <DriveDurationInput
              onSave={setVideoDuration}
              initialMinutes={Math.floor((videoDuration ?? 0) / 60)}
              initialSeconds={Math.floor((videoDuration ?? 0) % 60)}
            />
          )}

          <div className="space-y-4 border-t border-border pt-6">
            <h2 className="text-lg font-semibold text-foreground">Scoring & feedback</h2>
            <Card className="p-4">
              <RubricForm
                rubric={rubric}
                piLabels={scenario.pis}
                onChange={setRubric}
                piFeedback={piFeedback}
                onPiFeedbackChange={submitted ? undefined : (key, value) =>
                  setPiFeedback((prev) => ({ ...prev, [key]: value }))
                }
                centuryFeedback={centuryFeedback}
                onCenturyFeedbackChange={submitted ? undefined : setCenturyFeedback}
                readOnly={submitted}
              />
            </Card>

            <Card className="p-4">
              <Label htmlFor="overall-feedback" className="mb-1 block">
                Overall feedback
              </Label>
              <textarea
                id="overall-feedback"
                value={overallFeedback}
                onChange={(event) => setOverallFeedback(event.target.value)}
                placeholder="Write overall feedback for the student..."
                rows={3}
                disabled={submitted}
                className="w-full resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:bg-muted"
              />
            </Card>

            {!submitted && (
              <Button
                type="button"
                onClick={handleSubmitGrading}
                disabled={isPending}
                className="w-full"
                size="lg"
              >
                Submit final grade
              </Button>
            )}
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20">
          <div>
            <h3 className="mb-2 text-sm font-semibold text-foreground">Active comment</h3>
            <ActiveCommentPanel
              comment={activeComment}
              canDelete={!submitted && !!activeComment}
              onDelete={
                activeComment
                  ? () => deleteComment(activeComment.id)
                  : undefined
              }
            />
          </div>

          {showCommentForm && !submitted && (
            <Card className="border-primary/30 p-4">
              <div className="mb-2 text-sm font-medium text-primary">
                New comment at {formatTime(pendingTimestamp)}
              </div>
              <div className="mb-3 flex flex-wrap gap-2">
                {tagOptions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNewCommentTag(tag)}
                    className={cn(
                      "rounded-full border px-2 py-1 text-xs transition-colors",
                      newCommentTag === tag
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-border text-muted-foreground hover:border-border",
                    )}
                  >
                    {COMMENT_TAG_LABELS[tag]}
                  </button>
                ))}
              </div>
              <textarea
                value={newCommentText}
                onChange={(event) => setNewCommentText(event.target.value)}
                placeholder="Enter your feedback..."
                rows={3}
                className="w-full resize-none rounded-xl border border-input bg-card px-3 py-2 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                autoFocus
              />
              <div className="mt-2 flex gap-2">
                <Button type="button" size="sm" onClick={addComment}>
                  Add comment
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setShowCommentForm(false)}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          )}

          {comments.length > 0 && (
            <div>
              <h3 className="mb-2 text-sm font-semibold text-foreground">
                All comments ({comments.length})
              </h3>
              <div className="max-h-64 space-y-1.5 overflow-y-auto">
                {comments.map((comment) => (
                  <button
                    key={comment.id}
                    type="button"
                    onClick={() => setActiveComment(comment)}
                    className={cn(
                      "w-full rounded-xl p-2.5 text-left transition-colors",
                      activeComment?.id === comment.id
                        ? "border border-amber-200 bg-amber-50"
                        : "border border-border bg-card hover:border-border",
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
                    <p className="line-clamp-2 text-sm text-foreground">{comment.text}</p>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
