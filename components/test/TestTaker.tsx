"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { completeTest, recordTabEvent, saveAnswer } from "@/app/test/actions";
import { DecaButton } from "@/components/deca/button";
import { useSessionFocus } from "@/components/layout/session-focus-context";
import { formatCountdown, remainingSeconds } from "@/lib/test/timing";
import { cn } from "@/lib/utils";
import type { TestSession } from "@/lib/test/types";

type TestTakerProps = {
  session: TestSession;
};

export function TestTaker({ session }: TestTakerProps) {
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
  const pendingSaves = useRef(Promise.resolve());
  const failedSaves = useRef(new Set<string>());
  const lastLeaveAtRef = useRef(0);
  const answersRef = useRef(answers);
  answersRef.current = answers;

  const questions = useMemo(
    () => [...session.questions].sort((a, b) => a.display_order - b.display_order),
    [session.questions],
  );

  const current = questions[currentIndex];
  const answeredCount = questions.filter((q) => answers[q.id]).length;
  const unansweredCount = questions.length - answeredCount;

  const [elapsed, setElapsed] = useState(() =>
    Math.max(0, Math.floor((Date.now() - Date.parse(session.started_at)) / 1000)),
  );

  useEffect(() => {
    setFocusMode(!completed);
    return () => setFocusMode(false);
  }, [completed, setFocusMode]);

  useEffect(() => {
    if (completed) return;

    const logLeave = (eventType: "blur" | "hidden") => {
      const now = Date.now();
      if (now - lastLeaveAtRef.current < 1000) return;
      lastLeaveAtRef.current = now;
      void recordTabEvent(session.id, eventType).catch((leaveError) => {
        console.error("Could not record tab leave", leaveError);
      });
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

  useEffect(() => {
    if (completed || !timed || !session.time_limit_seconds) return;

    const tick = () => {
      const remaining = remainingSeconds(session.started_at, session.time_limit_seconds!);
      if (remaining <= 0 && !submittingRef.current) {
        submittingRef.current = true;
        startTransition(async () => {
          try {
            await completeTest(session.id);
          } catch (completeError) {
            submittingRef.current = false;
            setError(
              completeError instanceof Error
                ? completeError.message
                : "Time is up — could not submit automatically",
            );
          }
        });
      }
    };

    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [completed, session.id, session.started_at, session.time_limit_seconds, timed]);

  const submitSession = () => {
    if (submittingRef.current) return;
    submittingRef.current = true;
    setConfirmOpen(false);
    setError("");
    startTransition(async () => {
      try {
        await pendingSaves.current;
        const retry = [...failedSaves.current];
        if (retry.length > 0) {
          await Promise.all(
            retry.map((questionId) =>
              saveAnswer(session.id, questionId, answersRef.current[questionId]),
            ),
          );
          failedSaves.current.clear();
        }
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
    setError("");
    setAnswers((prev) =>
      prev[questionId] === choiceId ? prev : { ...prev, [questionId]: choiceId },
    );
    pendingSaves.current = pendingSaves.current
      .catch(() => undefined)
      .then(async () => {
        if (answersRef.current[questionId] !== choiceId) return;
        await saveAnswer(session.id, questionId, choiceId);
        failedSaves.current.delete(questionId);
      })
      .catch((saveError) => {
        if (answersRef.current[questionId] !== choiceId) return;
        failedSaves.current.add(questionId);
        setError(saveError instanceof Error ? saveError.message : "Could not save answer");
      });
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
          <span className="rounded-full bg-white px-[22px] py-2.5 font-display text-[22px] font-black tracking-[-0.02em] tabular-nums shadow-card">
            {formatCountdown(elapsed)}
            {timed && session.time_limit_seconds ? (
              <span className="text-mute"> / {formatCountdown(session.time_limit_seconds)}</span>
            ) : null}
          </span>
          <DecaButton href="/study/exams" variant="outline">
            {completed ? "Back to tests" : "Exit"}
          </DecaButton>
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
              <p className="mt-2 text-[13px] font-semibold tabular-nums text-white/80">
                {session.tab_leave_count} tab leave
                {session.tab_leave_count === 1 ? "" : "s"}
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
                <p className="mt-1 text-xs font-semibold tabular-nums text-mute">
                  {session.tab_leave_count} tab leave
                  {session.tab_leave_count === 1 ? "" : "s"}
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
