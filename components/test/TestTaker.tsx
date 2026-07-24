"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { completeTest, saveAnswer } from "@/app/test/actions";
import { useSessionFocus } from "@/components/layout/session-focus-context";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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
  const [isPending, startTransition] = useTransition();
  const completed = Boolean(session.completed_at);

  const questions = useMemo(
    () => [...session.questions].sort((a, b) => a.display_order - b.display_order),
    [session.questions],
  );

  const current = questions[currentIndex];
  const answeredCount = questions.filter((q) => q.chosen_choice_id).length;

  useEffect(() => {
    setFocusMode(!completed);
    return () => setFocusMode(false);
  }, [completed, setFocusMode]);

  const handleChoose = (choiceId: string) => {
    if (completed || !current) return;
    setError("");
    startTransition(async () => {
      try {
        await saveAnswer(session.id, current.id, choiceId);
        router.refresh();
      } catch (saveError) {
        setError(
          saveError instanceof Error ? saveError.message : "Could not save answer",
        );
      }
    });
  };

  const handleComplete = () => {
    setError("");
    startTransition(async () => {
      try {
        await completeTest(session.id);
      } catch (completeError) {
        setError(
          completeError instanceof Error
            ? completeError.message
            : "Could not submit test",
        );
      }
    });
  };

  if (!current) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">This test has no questions yet.</p>
      </Card>
    );
  }

  return (
    <div className={cn("mx-auto max-w-5xl px-4 pb-32 pt-6 sm:px-6", completed && "pb-12")}>
      <Card className="mb-6">
        <CardHeader className="pb-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                {session.exam_title ?? "Practice test"}
              </p>
              <p className="mt-1 text-sm text-muted-foreground">
                {session.cluster_name} · {session.exam_year}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium tabular-nums text-foreground">
                Question {current.display_order} of {session.total_questions}
              </p>
              <p className="text-xs tabular-nums text-muted-foreground">
                {answeredCount} answered
              </p>
            </div>
          </div>
          <div className="mt-4 h-2 overflow-hidden rounded-full bg-secondary">
            <div
              className="h-full rounded-full bg-primary transition-[width] duration-200"
              style={{
                width: `${(current.display_order / session.total_questions) * 100}%`,
              }}
            />
          </div>
        </CardHeader>
      </Card>

      {completed ? (
        <>
          <Card className="mb-6 border-primary/20 bg-gradient-to-br from-primary to-deca-green-dark text-primary-foreground">
            <CardContent className="p-6">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary-foreground/80">
                Test complete
              </p>
              <p className="mt-2 text-3xl font-bold tabular-nums">
                {session.score ?? 0}/{session.total_questions}
              </p>
              <p className="mt-2 text-sm text-primary-foreground/80">
                Review your answers below. Correct choices are highlighted in green.
              </p>
            </CardContent>
          </Card>

          <div className="mb-6 flex flex-wrap gap-2">
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
                    "inline-flex h-9 min-w-9 items-center justify-center rounded-xl px-2 text-xs font-semibold tabular-nums transition-colors",
                    index === currentIndex && "ring-2 ring-primary ring-offset-2",
                    correct
                      ? "bg-primary/15 text-primary"
                      : answered
                        ? "bg-red-100 text-red-700"
                        : "bg-muted text-muted-foreground",
                  )}
                >
                  {question.display_order}
                </button>
              );
            })}
          </div>
        </>
      ) : null}

      <Card>
        <CardContent className="p-6 sm:p-8">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            {current.pi_id && current.pi_code ? (
              <Link href={`/study/pis/${current.pi_id}`}>
                <Badge variant="default">PI: {current.pi_code}</Badge>
              </Link>
            ) : current.pi_code ? (
              <Badge variant="muted">PI: {current.pi_code}</Badge>
            ) : (
              <span />
            )}
          </div>

          <p className="text-lg font-medium leading-relaxed text-foreground">
            {current.question_text}
          </p>

          <div className="mt-6 space-y-3">
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
                    "flex w-full items-start gap-3 rounded-2xl border-2 px-4 py-4 text-left transition-[border-color,background-color,transform,box-shadow] duration-150 active:scale-[0.99] disabled:cursor-default",
                    showCorrect && "border-primary bg-primary/10 shadow-border",
                    showIncorrect && "border-red-300 bg-red-50",
                    !showCorrect &&
                      !showIncorrect &&
                      selected &&
                      "border-primary bg-primary/10 shadow-border",
                    !showCorrect &&
                      !showIncorrect &&
                      !selected &&
                      "border-border bg-card shadow-border hover:shadow-border-hover",
                  )}
                >
                  <span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold text-foreground">
                    {choice.label}
                  </span>
                  <span className="text-sm leading-relaxed text-foreground">{choice.text}</span>
                </button>
              );
            })}
          </div>

          {completed && current.rationale ? (
            <div className="mt-6 rounded-2xl bg-muted p-4">
              <p className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                Rationale
              </p>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {current.rationale}
              </p>
            </div>
          ) : null}

          {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

          {completed ? (
            <div className="mt-8 flex flex-wrap gap-3">
              <Button variant="secondary" asChild>
                <Link href="/tests/history">View test history</Link>
              </Button>
              <Button asChild>
                <Link href="/tests/full">Take another test</Link>
              </Button>
            </div>
          ) : null}
        </CardContent>
      </Card>

      {!completed ? (
        <div className="fixed inset-x-0 bottom-0 z-50 border-t border-border/60 bg-card/95 backdrop-blur-md shadow-border-hover">
          <div className="mx-auto flex max-w-5xl flex-col gap-4 px-4 py-4 sm:px-6">
            <div className="flex flex-wrap gap-2 overflow-x-auto pb-1">
              {questions.map((question, index) => {
                const answered = Boolean(question.chosen_choice_id);
                return (
                  <button
                    key={question.id}
                    type="button"
                    onClick={() => setCurrentIndex(index)}
                    className={cn(
                      "inline-flex h-9 min-w-9 shrink-0 items-center justify-center rounded-xl px-2 text-xs font-semibold tabular-nums transition-colors",
                      index === currentIndex
                        ? "bg-primary text-primary-foreground"
                        : answered
                          ? "bg-primary/15 text-primary"
                          : "bg-muted text-muted-foreground",
                    )}
                  >
                    {question.display_order}
                  </button>
                );
              })}
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3">
              <Button
                type="button"
                variant="ghost"
                disabled={currentIndex === 0}
                onClick={() => setCurrentIndex((index) => Math.max(0, index - 1))}
              >
                Back
              </Button>

              <div className="flex gap-2">
                {currentIndex === questions.length - 1 ? (
                  <Button type="button" disabled={isPending} onClick={handleComplete}>
                    {isPending ? "Submitting…" : "Submit test"}
                  </Button>
                ) : (
                  <Button
                    type="button"
                    disabled={currentIndex >= questions.length - 1}
                    onClick={() =>
                      setCurrentIndex((index) =>
                        Math.min(questions.length - 1, index + 1),
                      )
                    }
                  >
                    Next
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
