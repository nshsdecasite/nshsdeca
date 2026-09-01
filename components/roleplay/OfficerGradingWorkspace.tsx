"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import {
  deleteSubmission,
  saveGradingDraft,
  submitFinalGrading,
} from "@/app/roleplay/actions";
import { DecaButton } from "@/components/deca/button";
import { ScrubRail } from "@/components/deca/rail";
import { Segmented } from "@/components/deca/segmented";
import { createEmptyRubric } from "@/components/roleplay/RubricForm";
import VideoPlayer, { DriveDurationInput } from "@/components/roleplay/VideoPlayer";
import { monoTime } from "@/lib/deca/format";
import { RUBRIC_SCALE } from "@/lib/deca/placeholder";
import { resolveVideoSource } from "@/lib/roleplay/submission";
import type { Scenario } from "@/lib/roleplay/types";
import {
  COMMENT_TAG_LABELS,
  createEmptyPiFeedback,
  formatTime,
  getMaxScore,
  getTotalScore,
  type CommentTag,
  type Grading,
  type RubricScores,
  type Submission,
  type TimestampedComment,
} from "@/lib/roleplay/types";
import { cn } from "@/lib/utils";

const AUTO_SAVE_DELAY = 1500;

const SCALE_OPTIONS = RUBRIC_SCALE.map((item) => ({
  value: item.key,
  label: item.label,
  gold: item.key === "exceeds",
  score: item.score,
}));

type ScaleKey = (typeof RUBRIC_SCALE)[number]["key"];

function scoreToScale(score: number): ScaleKey | null {
  if (score >= 17) return "exceeds";
  if (score >= 13) return "meets";
  if (score >= 8) return "below";
  if (score > 0) return "little";
  return null;
}

function commentLabel(tag: CommentTag, scenario: Scenario) {
  if (tag.startsWith("PI-")) {
    const index = Number(tag.slice(3)) - 1;
    return (
      scenario.performanceIndicators?.[index]?.pi_code ??
      COMMENT_TAG_LABELS[tag]
    );
  }
  if (tag === "21st-century") return "21ST CENTURY";
  if (tag === "general") return "NOTE";
  return COMMENT_TAG_LABELS[tag];
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
  const [savedAt, setSavedAt] = useState<Date | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [submitted, setSubmitted] = useState(submission.status === "reviewed");
  const [isPending, startTransition] = useTransition();
  const saveTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const finalizedRef = useRef(submission.status === "reviewed");
  const seekRef = useRef<((time: number) => void) | null>(null);

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
          setSavedAt(new Date());
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
    setCurrentTime(time);
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

  const handleSaveDraft = () => {
    if (!rubric || submitted) return;
    clearTimeout(saveTimer.current);
    startTransition(async () => {
      setSaveStatus("saving");
      await saveGradingDraft(submission.id, buildGrading());
      setSaveStatus("saved");
      setSavedAt(new Date());
      setTimeout(() => setSaveStatus("idle"), 2000);
    });
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
  const railDuration = duration || videoDuration || 0;
  const progress = railDuration > 0 ? currentTime / railDuration : 0.38;
  const ticks = railDuration
    ? comments.map((comment) => comment.timestamp / railDuration)
    : [];

  const playingComment =
    comments.find((comment) => Math.abs(comment.timestamp - currentTime) < 2) ??
    activeComment;

  const total = getTotalScore(rubric);
  const max = getMaxScore(rubric) || 100;
  const student = submission.student_name ?? "Student";
  const firstName = student.split(" ")[0] ?? student;
  const eventBit = submission.event_code
    ? `${submission.event_code}${submission.event_name ? ` ${submission.event_name}` : ""}`
    : scenario.event;

  const setPiScale = (index: number, key: ScaleKey) => {
    const score = RUBRIC_SCALE.find((item) => item.key === key)?.score ?? 0;
    const piKey = `PI-${index + 1}`;
    setRubric({
      ...rubric,
      piScores: { ...rubric.piScores, [piKey]: score },
    });
  };

  const setCenturyScale = (key: ScaleKey) => {
    const score = RUBRIC_SCALE.find((item) => item.key === key)?.score ?? 0;
    setRubric({ ...rubric, centurySkills: score });
  };

  const draftLabel =
    saveStatus === "saving"
      ? "SAVING"
      : savedAt
        ? `DRAFT SAVED ${monoTime(savedAt)}`
        : submitted
          ? "GRADE SENT"
          : "DRAFT SAVED 12:04";

  return (
    <>
      <div className="flex items-end justify-between gap-8 border-b border-edge px-11 py-8">
        <div>
          <p className="eyebrow">
            Submission · {eventBit} · attempt {submission.attempt_number}
          </p>
          <h1 className="mt-3 font-display text-[32px] font-extrabold leading-[1.05] tracking-[-0.03em] text-ink">
            {scenario.title}
          </h1>
          <p className="mt-2.5 text-[15px] text-ink-2">
            {student}, submitted {formatSubmitted(submission.submitted_at)}
          </p>
        </div>
        <div className="flex items-center gap-3.5">
          <span className="whitespace-nowrap font-mono text-xs tabular text-mute">
            {draftLabel}
          </span>
          {!submitted ? (
            <DecaButton variant="outline" size="sm" onClick={handleSaveDraft} disabled={isPending}>
              Save draft
            </DecaButton>
          ) : null}
          {!submitted ? (
            <DecaButton size="sm" onClick={handleSubmitGrading} disabled={isPending}>
              Send grade
            </DecaButton>
          ) : null}
        </div>
      </div>

      <div className="grid grid-cols-[1.5fr_1fr]">
        <div className="border-r border-edge">
          <div className="border-b border-edge px-10 py-8">
            {submission.video_url ? (
              <VideoPlayer
                videoUrl={submission.video_url}
                videoSource={videoSource}
                comments={comments}
                manualDuration={videoDuration}
                onManualDurationChange={!submitted && isDrive ? setVideoDuration : undefined}
                showDurationInput={false}
                hideTimeline
                seekRef={seekRef}
                onPlaybackTime={(time, length) => {
                  setCurrentTime(time);
                  if (length > 0) setDuration(length);
                }}
                onTimelineClick={handleTimelineClick}
                interactive={!submitted}
                activeCommentId={activeComment?.id}
                onCommentClick={setActiveComment}
                onActiveCommentChange={setActiveComment}
                externalComments
              />
            ) : (
              <div className="flex aspect-video items-center justify-center rounded-[6px] bg-[#0f1f14]">
                <span className="font-mono text-xs tracking-[0.08em] text-white/45">
                  GOOGLE DRIVE VIDEO
                </span>
              </div>
            )}

            {isDrive && !submitted ? (
              <div className="mt-4">
                <DriveDurationInput
                  onSave={(seconds) => {
                    setVideoDuration(seconds);
                    setDuration(seconds);
                  }}
                  initialMinutes={Math.floor((videoDuration ?? 0) / 60)}
                  initialSeconds={Math.floor((videoDuration ?? 0) % 60)}
                />
              </div>
            ) : null}

            <ScrubRail
              className="mt-6"
              progress={progress}
              ticks={ticks}
              onSeek={(ratio) => {
                if (!railDuration) return;
                const time = ratio * railDuration;
                seekRef.current?.(time);
                setCurrentTime(time);
                handleTimelineClick(time);
              }}
            />
            <div className="mt-3 flex items-center justify-between font-mono text-xs tabular text-mute">
              <span>{formatTime(currentTime)}</span>
              <span className="font-sans text-sm text-mute">
                Click the rail to comment at that moment
              </span>
              <span>{railDuration > 0 ? formatTime(railDuration) : "0:00"}</span>
            </div>
          </div>

          <div className="px-10 py-8">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-extrabold tracking-[-0.025em] text-ink">
                Comments
              </h2>
              {!submitted ? (
                <button
                  type="button"
                  className="text-sm text-ever hover:text-ever-dk"
                  onClick={() => handleTimelineClick(currentTime || 0)}
                >
                  Add comment
                </button>
              ) : null}
            </div>

            {showCommentForm && !submitted ? (
              <div className="mb-4 rounded-[6px] border border-edge p-4">
                <p className="mb-3 font-mono text-xs text-ever">
                  {formatTime(pendingTimestamp)}
                </p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {tagOptions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNewCommentTag(tag)}
                      className={cn(
                        "rounded-[6px] px-3 py-1.5 font-mono text-xs transition-[background-color,color] duration-150",
                        newCommentTag === tag
                          ? "bg-ever text-white"
                          : "border border-edge text-ink-2 hover:bg-ever-lt hover:text-ever-dk",
                      )}
                    >
                      {commentLabel(tag, scenario)}
                    </button>
                  ))}
                </div>
                <textarea
                  value={newCommentText}
                  onChange={(event) => setNewCommentText(event.target.value)}
                  placeholder="Write the note for this moment"
                  rows={3}
                  className="w-full resize-none rounded-[6px] border border-edge bg-white px-3.5 py-3 text-[15px] leading-[1.6] text-ink"
                />
                <div className="mt-3 flex gap-2">
                  <DecaButton size="sm" onClick={addComment}>
                    Add comment
                  </DecaButton>
                  <DecaButton
                    size="sm"
                    variant="outline"
                    onClick={() => setShowCommentForm(false)}
                  >
                    Cancel
                  </DecaButton>
                </div>
              </div>
            ) : null}

            <div className="flex flex-col">
              {comments.length === 0 && !showCommentForm ? (
                <p className="py-6 text-[15px] leading-[1.6] text-ink-2">
                  Click the rail to pin a comment to a moment in the recording.
                </p>
              ) : null}
              {comments.map((comment, index) => {
                const playing = playingComment?.id === comment.id;
                return (
                  <button
                    key={comment.id}
                    type="button"
                    onClick={() => {
                      setActiveComment(comment);
                      seekRef.current?.(comment.timestamp);
                      setCurrentTime(comment.timestamp);
                    }}
                    className={cn(
                      "grid grid-cols-[64px_1fr] items-baseline gap-5 py-[18px] text-left",
                      playing
                        ? "my-0 -mx-5 rounded-[6px] bg-gold-lt px-5"
                        : index < comments.length - 1
                          ? "border-b border-hair"
                          : "",
                      !playing && index > 0 && comments[index - 1]?.id === playingComment?.id
                        ? "border-t border-hair"
                        : "",
                    )}
                  >
                    <span
                      className={cn(
                        "font-mono text-sm font-medium tabular",
                        playing ? "font-semibold text-gold" : "text-ever",
                      )}
                    >
                      {formatTime(comment.timestamp)}
                    </span>
                    <div>
                      <p
                        className={cn(
                          "mb-1.5 font-mono text-xs uppercase tracking-[0.08em]",
                          playing ? "text-gold" : "text-mute",
                        )}
                      >
                        {commentLabel(comment.tag, scenario)}
                        {playing ? " · PLAYING" : ""}
                      </p>
                      <p className="m-0 text-[15px] leading-[1.6] text-ink">
                        {comment.text}
                      </p>
                      {!submitted ? (
                        <span
                          role="button"
                          tabIndex={0}
                          onClick={(event) => {
                            event.stopPropagation();
                            deleteComment(comment.id);
                          }}
                          onKeyDown={(event) => {
                            if (event.key === "Enter" || event.key === " ") {
                              event.preventDefault();
                              deleteComment(comment.id);
                            }
                          }}
                          className="mt-2 inline-block font-mono text-[11px] uppercase tracking-[0.08em] text-mute hover:text-ink"
                        >
                          Remove
                        </span>
                      ) : null}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div>
          <div className="border-b border-edge px-9 py-8">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-2xl font-extrabold tracking-[-0.025em] text-ink">
                Rubric
              </h2>
              <span className="font-mono text-xs text-mute">0–20 EACH</span>
            </div>
            <div className="mt-6 flex flex-col gap-6">
              {scenario.pis.map((label, index) => {
                const key = `PI-${index + 1}` as const;
                const code =
                  scenario.performanceIndicators?.[index]?.pi_code ?? key;
                const selected = scoreToScale(rubric.piScores[key] ?? 0);
                return (
                  <div key={key}>
                    <p className="m-0 text-sm leading-[1.55] text-ink">
                      <span className="font-mono text-[13px] font-semibold text-ever">
                        {code}
                      </span>{" "}
                      {label}
                    </p>
                    <div className="mt-2.5">
                      <Segmented
                        name={key}
                        value={selected}
                        options={SCALE_OPTIONS}
                        onChange={submitted ? undefined : (value) => setPiScale(index, value)}
                      />
                    </div>
                  </div>
                );
              })}
              <div>
                <p className="m-0 text-sm leading-[1.55] text-ink">
                  21st Century Skills — overall presentation and judgment
                </p>
                <div className="mt-2.5">
                  <Segmented
                    name="century"
                    value={scoreToScale(rubric.centurySkills)}
                    options={SCALE_OPTIONS}
                    onChange={submitted ? undefined : setCenturyScale}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="flex items-end justify-between border-b border-edge bg-gold-lt px-9 py-7">
            <span className="font-mono text-xs uppercase tracking-[0.08em] text-gold">
              Total
            </span>
            <span className="font-display text-[44px] font-extrabold leading-none tracking-[-0.035em] tabular text-ink">
              {total}
              <span className="text-[18px] text-ink-2">/{max}</span>
            </span>
          </div>

          <div className="px-9 py-8">
            <h2 className="mb-4 font-display text-2xl font-extrabold tracking-[-0.025em] text-ink">
              Feedback to {firstName}
            </h2>
            <textarea
              value={overallFeedback}
              onChange={(event) => setOverallFeedback(event.target.value)}
              placeholder="Strong promotion section and a real budget. Two things before districts: connect buying behavior to the specific store openings, and close with an ask."
              rows={6}
              disabled={submitted}
              className="min-h-[132px] w-full resize-none rounded-[6px] border border-edge bg-white px-[18px] py-[18px] text-[15px] leading-[1.7] text-ink disabled:bg-ground"
            />
            <p className="mt-4 font-mono text-xs uppercase tracking-[0.08em] text-mute">
              {officerName} · {submission.status === "reviewed" ? "GRADED" : "GRADER"}
            </p>
            <Link
              href="/admin/grading"
              className="mt-4 inline-block text-sm text-ink-2 hover:text-ink"
            >
              Back to queue
            </Link>
            {!submitted ? (
              <button
                type="button"
                onClick={handleDeleteSubmission}
                disabled={isPending}
                className="mt-3 block font-mono text-[11px] uppercase tracking-[0.08em] text-mute hover:text-ink"
              >
                Delete submission
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}

function formatSubmitted(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}
