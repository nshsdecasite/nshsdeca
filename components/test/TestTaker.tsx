"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { completeTest, recordTabEvent, saveAnswers } from "@/app/test/actions";
import { DecaButton } from "@/components/deca/button";
import { TestCalculator } from "@/components/test/calculator";
import { useSessionFocus } from "@/components/layout/session-focus-context";
import { formatCountdown } from "@/lib/test/timing";
import { cn } from "@/lib/utils";
import type { TestSession } from "@/lib/test/types";

const ANSWER_BATCH_SIZE = 10;
const ANSWER_FLUSH_MS = 20_000;
const TAB_LEAVE_GAP_MS = 8_000;

function answerStorageKey(sessionId: string) {
  return `nshs-deca-answers:${sessionId}`;
}

function readStoredAnswers(sessionId: string): Record<string, string> {
  try {
    const raw = window.localStorage.getItem(answerStorageKey(sessionId));
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (!parsed || typeof parsed !== "object") return {};
    const stored: Record<string, string> = {};
    for (const [questionId, choiceId] of Object.entries(parsed)) {
      if (typeof choiceId === "string" && choiceId) stored[questionId] = choiceId;
    }
    return stored;
  } catch {
    return {};
  }
}

function describeTabLeaves(session: TestSession) {
  const leaves = session.tab_leaves ?? [];
  if (leaves.length === 0) {
    const count = session.tab_leave_count;
    return `${count} tab leave${count === 1 ? "" : "s"}`;
  }
  const numbers = leaves
    .map((leave) => leave.question_number)
    .filter((number): number is number => number != null);
  const unknown = leaves.length - numbers.length;
  const shown = numbers.slice(0, 8).map(String);
  const extra = numbers.length - shown.length;
  const questionText =
    shown.length === 0
      ? ""
      : shown.length === 1 && extra === 0
        ? `question ${shown[0]}`
        : `questions ${shown.join(", ")}${extra ? `, and ${extra} more` : ""}`;
  const unknownText = unknown
    ? `${unknown} leave${unknown === 1 ? "" : "s"} with no question recorded`
    : "";
  if (questionText && unknownText) return `Left the tab on ${questionText}. ${unknownText}.`;
  if (questionText) return `Left the tab on ${questionText}`;
  return unknownText;
}

function writeStoredAnswers(sessionId: string, answers: Record<string, string>) {
  try {
    window.localStorage.setItem(answerStorageKey(sessionId), JSON.stringify(answers));
  } catch {
    // A full disk or private-mode quota should not stop the test.
  }
}

type TestTakerProps = {
  session: TestSession;
};

export function TestTaker({ session }: TestTakerProps) {
  const router = useRouter();
  const { setFocusMode } = useSessionFocus();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [flagged, setFlagged] = useState<Set<string>>(new Set());
  const [answers, setAnswers] = useState<Record<string, string>>(() => {
    const initial: Record<string, string> = {};
    for (const question of session.questions) {
      if (question.chosen_choice_id) initial[question.id] = question.chosen_choice_id;
    }
    return initial;
  });
  const [isPending, startTransition] = useTransition();
  const completed = Boolean(session.completed_at);
  const timed = Boolean(session.timed && session.time_limit_seconds);
  const submittingRef = useRef(false);
  const dirtyAnswers = useRef<Record<string, string>>({});
  const flushChain = useRef(Promise.resolve());
  const flushTimer = useRef<number | null>(null);
  const tabSend = useRef<Promise<unknown> | null>(null);
  const lastLeaveAtRef = useRef(0);
  const questionNumberRef = useRef(1);
  const answersRef = useRef(answers);
  answersRef.current = answers;
  const serverAnswersRef = useRef(answers);

  const questions = useMemo(
    () => [...session.questions].sort((a, b) => a.display_order - b.display_order),
    [session.questions],
  );

  const current = questions[currentIndex];
  questionNumberRef.current = current?.display_order || currentIndex + 1;
  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const unansweredCount = questions.length - answeredCount;

  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - Date.parse(session.started_at)) / 1000)),
  );

  useEffect(() => {
    setFocusMode(!completed);
    return () => setFocusMode(false);
  }, [completed, setFocusMode]);

  const clearFlushTimer = () => {
    if (flushTimer.current != null) {
      window.clearTimeout(flushTimer.current);
      flushTimer.current = null;
    }
  };

  const flushOnce = async () => {
    const snapshot = { ...dirtyAnswers.current };
    const entries = Object.entries(snapshot);
    if (entries.length === 0) return;
    for (const [questionId, choiceId] of entries) {
      if (dirtyAnswers.current[questionId] === choiceId) {
        delete dirtyAnswers.current[questionId];
      }
    }
    try {
      await saveAnswers(
        session.id,
        entries.map(([questionId, choiceId]) => ({ questionId, choiceId })),
      );
    } catch (saveError) {
      for (const [questionId, choiceId] of entries) {
        if (
          answersRef.current[questionId] === choiceId &&
          dirtyAnswers.current[questionId] === undefined
        ) {
          dirtyAnswers.current[questionId] = choiceId;
        }
      }
      throw saveError;
    }
  };

  const enqueueFlush = () => {
    clearFlushTimer();
    const job = flushChain.current.then(flushOnce);
    flushChain.current = job.catch(() => undefined);
    return job;
  };

  const scheduleFlush = () => {
    const pending = Object.keys(dirtyAnswers.current).length;
    if (pending === 0) return;
    if (pending >= ANSWER_BATCH_SIZE) {
      void enqueueFlush().catch((saveError) => {
        setError(saveError instanceof Error ? saveError.message : "Could not save answers");
      });
      return;
    }
    if (flushTimer.current != null) return;
    flushTimer.current = window.setTimeout(() => {
      flushTimer.current = null;
      void enqueueFlush().catch((saveError) => {
        setError(saveError instanceof Error ? saveError.message : "Could not save answers");
      });
    }, ANSWER_FLUSH_MS);
  };

  const syncRef = useRef({ enqueueFlush, scheduleFlush });
  syncRef.current = { enqueueFlush, scheduleFlush };

  useEffect(() => {
    if (completed) {
      try {
        window.localStorage.removeItem(answerStorageKey(session.id));
      } catch {
        // ignore
      }
      return;
    }

    const stored = readStoredAnswers(session.id);
    const server = serverAnswersRef.current;
    if (Object.keys(stored).length > 0) {
      setAnswers((prev) => ({ ...prev, ...stored }));
      answersRef.current = { ...answersRef.current, ...stored };
      for (const [questionId, choiceId] of Object.entries(stored)) {
        if (choiceId && choiceId !== server[questionId]) {
          dirtyAnswers.current[questionId] = choiceId;
        }
      }
      if (Object.keys(dirtyAnswers.current).length > 0) {
        syncRef.current.scheduleFlush();
      }
    }

    const flushOnHide = () => {
      if (document.visibilityState === "hidden") {
        void syncRef.current.enqueueFlush().catch(() => undefined);
      }
    };
    const flushOnPageHide = () => {
      void syncRef.current.enqueueFlush().catch(() => undefined);
    };
    document.addEventListener("visibilitychange", flushOnHide);
    window.addEventListener("pagehide", flushOnPageHide);
    return () => {
      document.removeEventListener("visibilitychange", flushOnHide);
      window.removeEventListener("pagehide", flushOnPageHide);
      if (flushTimer.current != null) {
        window.clearTimeout(flushTimer.current);
        flushTimer.current = null;
      }
      void syncRef.current.enqueueFlush().catch(() => undefined);
    };
  }, [completed, session.id]);

  useEffect(() => {
    if (completed) return;

    const logLeave = (eventType: "blur" | "hidden") => {
      const now = Date.now();
      if (now - lastLeaveAtRef.current < TAB_LEAVE_GAP_MS) return;
      if (tabSend.current) return;
      lastLeaveAtRef.current = now;
      const pending = recordTabEvent(session.id, eventType, questionNumberRef.current)
        .catch((leaveError) => {
          console.error("Could not record tab leave", leaveError);
        })
        .finally(() => {
          tabSend.current = null;
        });
      tabSend.current = pending;
    };

    const onVisibilityChange = () => {
      if (document.hidden) logLeave("hidden");
    };

    const onBlur = () => {
      if (document.hidden) return;
      logLeave("blur");
    };

    window.addEventListener("blur", onBlur);
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => {
      window.removeEventListener("blur", onBlur);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [completed, session.id]);

  useEffect(() => {
    const end = completed && session.completed_at ? Date.parse(session.completed_at) : null;
    const tick = () => {
      const stop = end ?? Date.now();
      setElapsed(Math.max(0, Math.floor((stop - Date.parse(session.started_at)) / 1000)));
    };
    tick();
    if (end !== null) return;
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [completed, session.completed_at, session.started_at]);

  const submitSession = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setConfirmOpen(false);
    setError("");
    startTransition(async () => {
      try {
        await enqueueFlush();
        await completeTest(session.id);
      } catch (completeError) {
        submittingRef.current = false;
        setError(
          completeError instanceof Error ? completeError.message : "Could not submit test",
        );
      }
    });
  };

  const handleChoose = (choiceId: string) => {
    if (completed || !current || isPending) return;
    const questionId = current.id;
    if (answersRef.current[questionId] === choiceId) return;
    setError("");
    const next = { ...answersRef.current, [questionId]: choiceId };
    answersRef.current = next;
    setAnswers(next);
    writeStoredAnswers(session.id, next);
    dirtyAnswers.current[questionId] = choiceId;
    scheduleFlush();
  };

  const exitTest = () => {
    void enqueueFlush().catch(() => undefined);
    router.push("/tests");
  };

  const requestComplete = () => {
    if (unansweredCount > 0) {
      setConfirmOpen(true);
      return;
    }
    submitSession();
  };

  const toggleFlag = () => {
    if (!current) return;
    setFlagged((prev) => {
      const next = new Set(prev);
      if (next.has(current.id)) next.delete(current.id);
      else next.add(current.id);
      return next;
    });
  };

  if (!current) {
    return (
      <div className="px-9 py-16">
        <p className="text-sm text-mute">This test has no questions yet.</p>
      </div>
    );
  }

  const letters = ["A", "B", "C", "D", "E", "F"];
  const sessionAccuracy =
    completed && session.total_questions
      ? Math.round(((session.score ?? 0) / session.total_questions) * 100)
      : answeredCount
        ? Math.round((answeredCount / questions.length) * 100)
        : 0;

  const overLimit =
    timed &&
    session.time_limit_seconds != null &&
    elapsed >= session.time_limit_seconds;

  const examName = [session.cluster_name || session.exam_title || "Exam", session.exam_year]
    .filter((part) => part !== null && part !== undefined && String(part).length > 0)
    .join(" ");
  const lastQuestion = currentIndex === questions.length - 1;

  return (
    <div className="pb-24">
      <div className="flex flex-wrap items-center justify-between gap-6">
        <h1 className="text-balance font-display text-[28px] font-black tracking-[-0.03em]">
          {examName}
        </h1>
        <div className="flex items-center gap-3.5">
          <span
            className={cn(
              "rounded-full px-[22px] py-2.5 font-display text-[22px] font-black tracking-[-0.02em] tabular-nums shadow-card",
              overLimit ? "bg-[#fde8e6] text-[#b42318]" : "bg-white",
            )}
          >
            {formatCountdown(elapsed)}
            {timed && session.time_limit_seconds ? (
              <span className={overLimit ? "text-[#b42318]" : "text-mute"}>
                {" "}
                / {formatCountdown(session.time_limit_seconds)}
              </span>
            ) : null}
          </span>
          {completed ? (
            <DecaButton href="/tests" variant="outline">
              Back to tests
            </DecaButton>
          ) : (
            <DecaButton variant="outline" onClick={exitTest}>
              Exit
            </DecaButton>
          )}
        </div>
      </div>

      <div className="mt-[22px] grid grid-cols-1 gap-4 xl:grid-cols-[1fr_340px]">
        <div className="deca-card px-11 py-10">
          {completed ? (
            <div className="mb-6 rounded-2xl bg-ever-dk px-6 py-5 text-white">
              <p className="text-[11px] font-bold tracking-[0.14em] uppercase text-white/80">
                Complete
              </p>
              <p className="mt-1 font-display text-4xl font-black tracking-[-0.035em] tabular-nums">
                {session.score ?? 0}
                <span className="text-lg text-white/70">/{session.total_questions}</span>
              </p>
              <p className="mt-2 text-[13px] font-semibold text-pretty text-white/80">
                {describeTabLeaves(session)}
              </p>
            </div>
          ) : null}
          <div className="flex flex-wrap items-center gap-3">
            {current.pi_code ? (
              <span className="rounded-full bg-ever-lt px-3.5 py-1.5 text-xs font-extrabold text-ever-dk">
                {current.pi_code}
              </span>
            ) : null}
            {!completed ? (
              <button
                type="button"
                onClick={toggleFlag}
                className="text-[13px] font-semibold text-mute transition-colors duration-150 hover:text-ever-dk"
              >
                {flagged.has(current.id) ? "Flagged" : "Flag for review"}
              </button>
            ) : null}
          </div>
          <p className="mt-[22px] max-w-[56ch] text-[23px] leading-[1.45] font-semibold">
            {current.question_text}
          </p>
          <div className="mt-[30px] flex max-w-[620px] flex-col gap-2.5">
            {current.choices.map((choice, index) => {
              const selected = answers[current.id] === choice.id;
              const showCorrect = completed && choice.is_correct;
              const showIncorrect = completed && selected && !choice.is_correct;
              const letter = choice.label || letters[index] || String(index + 1);
              return (
                <button
                  key={choice.id}
                  type="button"
                  disabled={completed}
                  onClick={() => handleChoose(choice.id)}
                  className={cn(
                    "flex items-center gap-3.5 rounded-2xl border-[1.5px] px-[18px] py-4 text-left text-[15px] transition-[background-color,border-color,transform] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96] disabled:active:scale-100",
                    showCorrect && "border-ever bg-ever-lt",
                    showIncorrect && "border-[#d9b48a] bg-gold-lt",
                    !showCorrect &&
                      !showIncorrect &&
                      selected &&
                      "border-ever bg-ever-lt font-semibold shadow-[0_0_0_3px_#dde3d3]",
                    !showCorrect &&
                      !showIncorrect &&
                      !selected &&
                      "border-edge hover:bg-ground",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-[30px] w-[30px] flex-none items-center justify-center rounded-full text-sm font-extrabold",
                      selected || showCorrect
                        ? "bg-ever-dk text-white"
                        : "bg-ground text-mute",
                    )}
                  >
                    {letter}
                  </span>
                  {choice.text}
                </button>
              );
            })}
          </div>
          {completed && current.rationale ? (
            <div className="mt-7 rounded-2xl bg-ground px-5 py-4">
              <p className="text-xs font-extrabold tracking-[0.1em] uppercase text-ever-dk">
                Rationale
              </p>
              <p className="mt-2 text-sm leading-relaxed text-ink-2">{current.rationale}</p>
            </div>
          ) : null}
          {error ? <p className="mt-4 text-sm text-[#b42318]">{error}</p> : null}
        </div>

        <div className="flex flex-col gap-4">
          <TestCalculator />
          <div className="deca-card px-[26px] py-6">
            <div className="flex items-baseline justify-between">
              <h2 className="font-display text-[17px] font-extrabold tracking-[-0.02em]">
                Question map
              </h2>
              <span className="text-[11px] font-bold text-mute">
                {answeredCount}/{questions.length}
              </span>
            </div>
            <p className="mt-1 mb-3.5 text-xs text-mute">
              Darker means answered. Gold means flagged.
            </p>
            <div className="grid grid-cols-10 gap-[5px]">
              {questions.map((question, index) => {
                const answered = Boolean(answers[question.id]);
                const correct = question.choices.find(
                  (c) => c.id === answers[question.id],
                )?.is_correct;
                const isFlagged = flagged.has(question.id);
                return (
                  <button
                    key={question.id}
                    type="button"
                    aria-label={`Question ${question.display_order}`}
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "aspect-square rounded-[5px]",
                      index === currentIndex && "ring-2 ring-ever-dk ring-offset-1",
                      completed
                        ? correct
                          ? "bg-ever-dk"
                          : answered
                            ? "bg-[#d9b48a]"
                            : "bg-ever-lt"
                        : isFlagged
                          ? "bg-[#d9b48a]"
                          : answered
                            ? "bg-ever"
                            : "bg-ever-lt",
                    )}
                  />
                );
              })}
            </div>
          </div>
          <div className="deca-card flex items-center justify-between px-[26px] py-6">
            <div>
              <p className="text-xs font-semibold text-mute">
                {completed ? "Exam score" : "Answered"}
              </p>
              <p className="mt-1.5 font-display text-[28px] font-black tracking-[-0.03em] tabular-nums">
                {completed ? session.score ?? 0 : answeredCount}
                <span className="text-base text-mute">/{session.total_questions}</span>
              </p>
              {completed ? (
                <p className="mt-1 text-xs font-semibold text-pretty text-mute">
                  {describeTabLeaves(session)}
                </p>
              ) : null}
            </div>
            <span className="rounded-full bg-ever-lt px-3.5 py-1.5 text-[13px] font-extrabold text-ever-dk">
              {sessionAccuracy}%
            </span>
          </div>
        </div>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-edge bg-white/95 backdrop-blur-sm">
        <div className="mx-auto flex w-full items-center justify-between gap-3 px-5 py-3 sm:px-8 lg:w-[70%] lg:max-w-[1100px] lg:px-0">
          <p className="text-sm font-bold tabular-nums text-ink">
            {currentIndex + 1} of {questions.length}
          </p>
          <div className="flex items-center gap-2">
            <DecaButton
              variant="outline"
              size="sm"
              disabled={currentIndex === 0}
              onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
            >
              Back
            </DecaButton>
            {lastQuestion && !completed ? (
              <DecaButton size="sm" disabled={isPending} onClick={requestComplete}>
                {isPending ? "Submitting…" : "Submit"}
              </DecaButton>
            ) : lastQuestion ? (
              <DecaButton href="/tests/history" size="sm">
                History
              </DecaButton>
            ) : (
              <DecaButton
                size="sm"
                onClick={() => setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))}
              >
                Next
              </DecaButton>
            )}
          </div>
        </div>
      </div>

      {confirmOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/30 px-4">
          <div className="deca-card w-full max-w-md px-8 py-7">
            <h2 className="font-display text-[21px] font-extrabold tracking-[-0.02em]">
              Submit with unanswered questions?
            </h2>
            <p className="mt-2 text-sm text-ink-2">
              {unansweredCount} question{unansweredCount === 1 ? "" : "s"} still blank.
              Blank answers are scored as incorrect.
            </p>
            <div className="mt-6 flex gap-2">
              <DecaButton variant="outline" onClick={() => setConfirmOpen(false)}>
                Keep working
              </DecaButton>
              <DecaButton disabled={isPending} onClick={submitSession}>
                Submit anyway
              </DecaButton>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
