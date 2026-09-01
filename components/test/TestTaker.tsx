"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import { completeTest, saveAnswer } from "@/app/test/actions";
import { useSessionFocus } from "@/components/layout/session-focus-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { formatCountdown, remainingSeconds } from "@/lib/test/timing";
import { cn } from "@/lib/utils";
import type { TestSession } from "@/lib/test/types";

type TestTakerProps = {
  session: TestSession;
};

export function TestTaker({ session }: TestTakerProps) {
  const router = useRouter();
  const { setFocusMode } = useSessionFocus();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [error, setError] = useState("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const completed = Boolean(session.completed_at);
  const timed = Boolean(session.timed && session.time_limit_seconds);
  const submittingRef = useRef(false);

  const questions = useMemo(
    () => [...session.questions].sort((a, b) => a.display_order - b.display_order),
    [session.questions],
  );

  const current = questions[currentIndex];
  const answeredCount = questions.filter((q) => q.chosen_choice_id).length;
  const unansweredCount = questions.length - answeredCount;

  const [secondsLeft, setSecondsLeft] = useState(() =>
    timed && session.time_limit_seconds
      ? remainingSeconds(session.started_at, session.time_limit_seconds)
      : null,
  );

  useEffect(() => {
    setFocusMode(!completed);
    return () => setFocusMode(false);
  }, [completed, setFocusMode]);

  useEffect(() => {
    if (completed || !timed || !session.time_limit_seconds) return;

    const tick = () => {
      const remaining = remainingSeconds(session.started_at, session.time_limit_seconds!);
      setSecondsLeft(remaining);
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
    if (completed || !current) return;
    setError("");
    startTransition(async () => {
      try {
        await saveAnswer(session.id, current.id, choiceId);
        router.refresh();
      } catch (saveError) {
        setError(saveError instanceof Error ? saveError.message : "Could not save answer");
      }
    });
  };

  const requestComplete = () => {
    if (unansweredCount > 0) {
      setConfirmOpen(true);
      return;
    }
    submitSession();
  };

  if (!current) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <p className="text-sm text-muted-foreground">This test has no questions yet.</p>
      </div>
    );
  }

  return (
    <div className={cn("mx-auto max-w-3xl px-4 pt-8 sm:px-6", completed ? "pb-12" : "pb-36")}>
      <div className="mb-6 flex items-end justify-between gap-4">
        <div>
          <p className="eyebrow">{session.exam_title ?? "Practice test"}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {session.cluster_name} · {session.exam_year}
          </p>
        </div>
        <div className="text-right">
          {timed && secondsLeft !== null && !completed ? (
            <p
              className={cn(
                "text-sm font-semibold tabular-nums",
                secondsLeft <= 60 ? "text-destructive" : "text-foreground",
              )}
            >
              {formatCountdown(secondsLeft)}
            </p>
          ) : null}
          <p className="text-sm tabular-nums text-muted-foreground">
            {current.display_order} / {session.total_questions}
            <span className="ml-2 text-xs">· {answeredCount} answered</span>
          </p>
        </div>
      </div>

      <div className="mb-6 h-1 overflow-hidden rounded-full bg-muted">
        <div
          className="h-full bg-primary transition-[width] duration-200 ease-out"
          style={{ width: `${(current.display_order / session.total_questions) * 100}%` }}
        />
      </div>

      {completed ? (
        <Card className="mb-6 bg-primary text-primary-foreground">
          <CardContent className="p-5">
            <p className="text-[11px] font-medium uppercase tracking-[0.14em] text-primary-foreground/70">
              Complete
            </p>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              {session.score ?? 0}
              <span className="text-lg font-medium text-primary-foreground/70">
                /{session.total_questions}
              </span>
            </p>
          </CardContent>
        </Card>
      ) : null}

      {completed ? (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {questions.map((question, index) => {
            const answered = Boolean(question.chosen_choice_id);
            const correct = question.choices.find(
              (c) => c.id === question.chosen_choice_id,
            )?.is_correct;
            return (
              <button
                key={question.id}
                type="button"
                onClick={() => setCurrentIndex(index)}
                className={cn(
                  "inline-flex h-8 min-w-8 items-center justify-center rounded-md px-1.5 text-xs font-medium tabular-nums transition-colors duration-150",
                  index === currentIndex && "ring-2 ring-primary ring-offset-1",
                  correct
                    ? "bg-primary/15 text-primary"
                    : answered
                      ? "bg-red-50 text-red-700"
                      : "bg-muted text-muted-foreground",
                )}
              >
                {question.display_order}
              </button>
            );
          })}
        </div>
      ) : null}

      <Card>
        <CardContent className="p-5 sm:p-6">
          {current.pi_code ? (
            current.pi_id ? (
              <Link href={`/study/pis/${current.pi_id}`}>
                <Badge>PI {current.pi_code}</Badge>
              </Link>
            ) : (
              <Badge variant="muted">PI {current.pi_code}</Badge>
            )
          ) : null}

          <p className="mt-4 text-[17px] font-medium leading-relaxed">{current.question_text}</p>

          <div className="mt-5 space-y-2">
            {current.choices.map((choice) => {
              const selected = current.chosen_choice_id === choice.id;
              const showCorrect = completed && choice.is_correct;
              const showIncorrect = completed && selected && !choice.is_correct;

              return (
                <button
                  key={choice.id}
                  type="button"
                  disabled={completed || isPending}
                  onClick={() => handleChoose(choice.id)}
                  className={cn(
                    "flex w-full items-start gap-3 rounded-lg px-3.5 py-3 text-left shadow-border transition-[box-shadow,background-color,transform] duration-150 ease-out active:scale-[0.96] disabled:cursor-default",
                    showCorrect && "bg-primary/8",
                    showIncorrect && "bg-red-50",
                    !showCorrect && !showIncorrect && selected && "bg-primary/8",
                    !showCorrect && !showIncorrect && !selected && "bg-card hover:shadow-border-hover",
                  )}
                >
                  <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-muted text-xs font-semibold">
                    {choice.label}
                  </span>
                  <span className="text-sm leading-relaxed">{choice.text}</span>
                </button>
              );
            })}
          </div>

          {completed && current.rationale ? (
            <div className="mt-5 rounded-lg bg-muted p-4">
              <p className="eyebrow">Rationale</p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {current.rationale}
              </p>
            </div>
          ) : null}

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

          {completed ? (
            <div className="mt-6 flex flex-wrap gap-2">
              <Button variant="secondary" asChild>
                <Link href="/tests/history">History</Link>
              </Button>
              <Button asChild>
                <Link href="/tests/full">Another test</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!completed ? (
        <div className="fixed inset-x-0 bottom-0 z-50 bg-card/95 shadow-border backdrop-blur-md">
          <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-3 sm:px-6">
            <div className="flex gap-1 overflow-x-auto">
              {questions.map((question, index) => {
                const answered = Boolean(question.chosen_choice_id);
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "inline-flex h-8 min-w-8 shrink-0 items-center justify-center rounded-md text-xs font-medium tabular-nums transition-colors duration-150",
                      index === currentIndex
                        ? "bg-primary text-primary-foreground"
                        : answered
                          ? "bg-primary/12 text-primary"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {question.display_order}
                  </button>
                );
              })}
            </div>
            <div className="flex items-center justify-between">
              <Button
                type="button"
                variant="ghost"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))}
              >
                Back
              </Button>
              {currentIndex === questions.length - 1 ? (
                <Button type="button" disabled={isPending} onClick={requestComplete}>
                  {isPending ? "Submitting…" : "Submit"}
                </Button>
              ) : (
                <Button
                  type="button"
                  onClick={() =>
                    setCurrentIndex((i) => Math.min(questions.length - 1, i + 1))
                  }
                >
                  Next
                </Button>
              )}
            </div>
          </div>
        </div>
      ) : null}

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit with unanswered questions?</DialogTitle>
            <DialogDescription>
              {unansweredCount} question{unansweredCount === 1 ? "" : "s"} still blank.
              Blank answers are scored as incorrect.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button type="button" variant="secondary" onClick={() => setConfirmOpen(false)}>
              Keep working
            </Button>
            <Button type="button" disabled={isPending} onClick={submitSession}>
              Submit anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
