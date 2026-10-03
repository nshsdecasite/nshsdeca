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
    <div className="px-9 py-9">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold tracking-[0.1em] uppercase text-mute">
            Submission · {eventBit} · attempt {submission.attempt_number}
          </p>
          <h1 className="mt-2.5 font-display text-[32px] font-black tracking-[-0.035em]">
            {scenario.title}
          </h1>
          <p className="mt-2 text-sm text-ink-2">
            {student} · submitted {formatSubmitted(submission.submitted_at)}
          </p>
        </div>
        <div className="flex items-center gap-2.5">
          <span className="rounded-full bg-ever-lt px-3.5 py-1.5 text-[11px] font-extrabold text-ever-dk">
            {submitted ? "GRADED" : "IN REVIEW"}
          </span>
          {!submitted ? (
            <DecaButton variant="outline" onClick={handleSaveDraft} disabled={isPending}>
              Save draft
            </DecaButton>
          ) : null}
          {!submitted ? (
            <DecaButton onClick={handleSubmitGrading} disabled={isPending}>
              Release score
            </DecaButton>
          ) : null}
        </div>
      </div>
      <p className="mt-3 text-xs font-bold text-mute">{draftLabel}</p>

      <div className="mt-6 grid grid-cols-1 gap-4 xl:grid-cols-[1fr_400px]">
        <div className="flex flex-col gap-4">
          <div className="relative overflow-hidden rounded-[20px] bg-[#33322b]">
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
              <div className="flex aspect-video items-center justify-center">
                <span className="text-xs font-bold tracking-[0.14em] text-white/62">
                  RECORDED ROLEPLAY
                </span>
              </div>
            )}
            <div className="px-[22px] pb-[18px]">
              <ScrubRail
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
              <div className="mt-2 flex justify-between text-[11px] font-bold text-white/85">
                <span>{formatTime(currentTime)}</span>
                <span>{railDuration > 0 ? formatTime(railDuration) : "0:00"}</span>
              </div>
            </div>
          </div>

            {isDrive && !submitted ? (
              <div className="deca-card px-6 py-4">
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

          <div className="deca-card px-[30px] py-[26px]">
            <div className="mb-4 flex items-baseline justify-between">
              <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
                Pinned comments
              </h2>
              {!submitted ? (
                <button
                  type="button"
                  className="text-xs font-bold text-ever-dk hover:text-ever"
                  onClick={() => handleTimelineClick(currentTime || 0)}
                >
                  Add at {formatTime(currentTime)}
                </button>
              ) : null}
            </div>

            {showCommentForm && !submitted ? (
              <div className="mb-4 rounded-2xl bg-ground p-4">
                <p className="mb-3 text-xs font-extrabold text-ever-dk">
                  {formatTime(pendingTimestamp)}
                </p>
                <div className="mb-3 flex flex-wrap gap-2">
                  {tagOptions.map((tag) => (
                    <button
                      key={tag}
                      type="button"
                      onClick={() => setNewCommentTag(tag)}
                      className={cn(
                        "rounded-full px-3 py-1.5 text-xs font-bold transition-colors duration-150",
                        newCommentTag === tag
                          ? "bg-ever-dk text-white"
                          : "bg-white text-ink-2 shadow-card",
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
                  className="deca-field resize-none"
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

            <div className="flex flex-col gap-2.5">
              {comments.length === 0 && !showCommentForm ? (
                <p className="py-2 text-sm leading-[1.6] text-ink-2">
                  Click the rail to pin a comment to a moment in the recording.
                </p>
              ) : null}
              {comments.map((comment) => {
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
                      "flex gap-3.5 rounded-[14px] bg-ground px-4 py-3.5 text-left",
                      playing && "bg-gold-lt",
                    )}
                  >
                    <span className="h-max flex-none rounded-full bg-white px-2.5 py-[3px] text-xs font-extrabold text-ever-dk">
                      {formatTime(comment.timestamp)}
                    </span>
                    <span className="text-sm leading-[1.5]">
                      {comment.text}
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
                          className="mt-2 block text-[11px] font-bold text-mute hover:text-ink"
                        >
                          Remove
                        </span>
                      ) : null}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4">
          <div className="deca-card px-7 py-[26px]">
            <div className="mb-[18px] flex items-baseline justify-between">
              <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
                Evaluation form
              </h2>
              <span className="text-[11px] font-bold text-mute">0–20 each</span>
            </div>
            <div className="flex flex-col gap-[18px]">
              {scenario.pis.map((label, index) => {
                const key = `PI-${index + 1}` as const;
                const score = rubric.piScores[key] ?? 0;
                const selected = scoreToScale(score);
                return (
                  <div key={key}>
                    <div className="flex items-baseline justify-between">
                      <span className="max-w-[24ch] text-[13px] font-semibold">{label}</span>
                      <span className="text-sm font-extrabold">{score || "—"}</span>
                    </div>
                    <div className="mt-2 h-[9px] overflow-hidden rounded-full bg-ground">
                      <div
                        className={cn(
                          "h-[9px] rounded-full",
                          score >= 16 ? "bg-ever" : "bg-acc-mid",
                        )}
                        style={{ width: `${(score / 20) * 100}%` }}
                      />
                    </div>
                    <div className="mt-2">
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
                <div className="flex items-baseline justify-between">
                  <span className="max-w-[24ch] text-[13px] font-semibold">
                    Overall impression
                  </span>
                  <span className="text-sm font-extrabold">
                    {rubric.centurySkills || "—"}
                  </span>
                </div>
                <div className="mt-2 h-[9px] overflow-hidden rounded-full bg-ground">
                  <div
                    className="h-[9px] rounded-full bg-ever"
                    style={{ width: `${(rubric.centurySkills / 20) * 100}%` }}
                  />
                </div>
                <div className="mt-2">
                  <Segmented
                    name="century"
                    value={scoreToScale(rubric.centurySkills)}
                    options={SCALE_OPTIONS}
                    onChange={submitted ? undefined : setCenturyScale}
                  />
                </div>
              </div>
            </div>
            <div className="mt-[22px] flex items-center justify-between rounded-2xl bg-ever-lt px-5 py-4">
              <span className="text-xs font-bold tracking-[0.1em] uppercase text-ever-dk">
                Total
              </span>
              <span className="font-display text-[30px] font-black tracking-[-0.035em]">
                {total}
                <span className="text-base text-mute">/{max}</span>
              </span>
            </div>
          </div>

          <div className="deca-card flex-1 px-7 py-[26px]">
            <h2 className="mb-3.5 font-display text-[19px] font-extrabold tracking-[-0.02em]">
              Feedback to {firstName}
            </h2>
            <textarea
              value={overallFeedback}
              onChange={(event) => setOverallFeedback(event.target.value)}
              placeholder="Strong promotion section and a real media plan. Two things before district: put a dollar figure on the budget and defend it."
              rows={5}
              disabled={submitted}
              className="min-h-[110px] w-full resize-none rounded-2xl border-[1.5px] border-edge bg-white p-4 text-sm leading-[1.65] text-ink disabled:bg-ground"
            />
            <div className="mt-4 flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-ever-lt text-xs font-extrabold text-ever-dk">
                {officerName
                  .split(" ")
                  .filter(Boolean)
                  .map((part) => part[0])
                  .join("")
                  .slice(0, 2)
                  .toUpperCase() || "OF"}
              </div>
              <p className="m-0 text-xs font-bold text-ink-2">{officerName}</p>
            </div>
            <Link
              href="/admin/grading"
              className="mt-4 inline-block text-[13px] font-bold text-ever-dk hover:text-ever"
            >
              Back to queue
            </Link>
            {!submitted ? (
              <button
                type="button"
                onClick={handleDeleteSubmission}
                disabled={isPending}
                className="mt-3 block text-[11px] font-bold text-mute hover:text-ink"
              >
                Delete submission
              </button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

function formatSubmitted(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { month: "long", day: "numeric" });
}
