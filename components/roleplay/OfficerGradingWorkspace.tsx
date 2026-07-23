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
      <div className="bg-slate-50 border border-slate-200 rounded-2xl p-6 flex flex-col items-center justify-center text-center min-h-[200px]">
        <span className="text-3xl mb-2">💬</span>
        <p className="text-sm text-muted">
          Timestamped comments appear here during playback, or when you click a
          marker on the timeline.
        </p>
      </div>
    );
  }

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-sm font-mono font-medium text-amber-700">
            {formatTime(comment.timestamp)}
          </span>
          <span className="text-xs bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full">
            {COMMENT_TAG_LABELS[comment.tag]}
          </span>
        </div>
        {canDelete && onDelete && (
          <button
            type="button"
            onClick={onDelete}
            className="text-muted hover:text-red-500 text-sm"
            title="Delete comment"
          >
            ×
          </button>
        )}
      </div>
      <p className="text-sm text-ink leading-relaxed">{comment.text}</p>
    </div>
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
      if (submitted) return;
      setSaveStatus("saving");
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        startTransition(async () => {
          await saveGradingDraft(submission.id, grading);
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
    startTransition(async () => {
      await submitFinalGrading(submission.id, buildGrading());
      setSubmitted(true);
      router.push("/admin/grading");
      router.refresh();
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
          <Link href="/admin/grading" className="text-sm text-deca-green hover:underline">
            ← Back to queue
          </Link>
          <h1 className="text-2xl font-bold text-ink mt-2">{scenario.title}</h1>
          <p className="text-muted">
            {submission.student_name ?? "Student"} · {scenario.event} · Attempt #
            {submission.attempt_number}
          </p>
        </div>
        <div className="flex items-center gap-3">
          {saveStatus === "saving" && (
            <span className="text-xs text-muted">Saving...</span>
          )}
          {saveStatus === "saved" && (
            <span className="text-xs text-green-600">Saved</span>
          )}
          {submitted && (
            <span className="text-xs font-medium bg-green-100 text-green-700 px-2.5 py-1 rounded-full">
              Submitted
            </span>
          )}
          <button
            type="button"
            onClick={handleDeleteSubmission}
            disabled={isPending}
            className="text-xs text-red-600 hover:text-red-800 font-medium px-2.5 py-1 rounded-lg hover:bg-red-50 transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <div className="grid lg:grid-cols-3 gap-6 items-start">
        <div className="lg:col-span-2 space-y-4">
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

          <div className="border-t border-slate-200 pt-6 space-y-4">
            <h2 className="text-lg font-semibold text-ink">Scoring & feedback</h2>
            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-soft">
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
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 p-4 shadow-soft">
              <label className="block text-sm font-semibold text-ink mb-1">
                Overall feedback
              </label>
              <textarea
                value={overallFeedback}
                onChange={(event) => setOverallFeedback(event.target.value)}
                placeholder="Write overall feedback for the student..."
                rows={3}
                disabled={submitted}
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deca-green resize-none disabled:bg-slate-50"
              />
            </div>

            {!submitted && (
              <button
                type="button"
                onClick={handleSubmitGrading}
                disabled={isPending}
                className="w-full bg-green-600 text-white font-medium py-2.5 rounded-2xl hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                Submit final grade
              </button>
            )}
          </div>
        </div>

        <div className="space-y-4 lg:sticky lg:top-20">
          <div>
            <h3 className="text-sm font-semibold text-ink mb-2">Active comment</h3>
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
            <div className="bg-white border border-deca-green/30 rounded-2xl p-4 shadow-soft">
              <div className="text-sm font-medium text-deca-green mb-2">
                New comment at {formatTime(pendingTimestamp)}
              </div>
              <div className="flex gap-2 mb-3 flex-wrap">
                {tagOptions.map((tag) => (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => setNewCommentTag(tag)}
                    className={`text-xs px-2 py-1 rounded-full border transition-colors ${
                      newCommentTag === tag
                        ? "bg-deca-green-light border-deca-green text-deca-green-dark"
                        : "border-slate-200 text-muted hover:border-slate-300"
                    }`}
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
                className="w-full border border-slate-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-deca-green resize-none"
                autoFocus
              />
              <div className="flex gap-2 mt-2">
                <button
                  type="button"
                  onClick={addComment}
                  className="bg-deca-green text-white text-sm px-4 py-1.5 rounded-xl hover:bg-deca-green-dark"
                >
                  Add comment
                </button>
                <button
                  type="button"
                  onClick={() => setShowCommentForm(false)}
                  className="text-sm text-muted px-4 py-1.5 hover:text-ink"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}

          {comments.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-ink mb-2">
                All comments ({comments.length})
              </h3>
              <div className="space-y-1.5 max-h-64 overflow-y-auto">
                {comments.map((comment) => (
                  <button
                    key={comment.id}
                    type="button"
                    onClick={() => setActiveComment(comment)}
                    className={`w-full text-left p-2.5 rounded-xl transition-colors ${
                      activeComment?.id === comment.id
                        ? "bg-amber-50 border border-amber-200"
                        : "bg-white border border-slate-200 hover:border-slate-300"
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
                    <p className="text-sm text-ink line-clamp-2">{comment.text}</p>
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
