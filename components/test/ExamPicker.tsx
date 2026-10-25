"use client";

import { useState, useTransition } from "react";
import { isRedirectError } from "next/dist/client/components/redirect-error";
import { startFullExam } from "@/app/test/actions";
import { TimedModeField } from "@/components/test/TimedModeField";
import { examIsAssigned } from "@/lib/test/exam-window";
import type { ExamSummary } from "@/lib/test/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ExamPickerProps = {
  exams: ExamSummary[];
  lockWindow?: boolean;
  assignedClusterSlug?: string | null;
};

export function ExamPicker({ exams, lockWindow = false, assignedClusterSlug = null }: ExamPickerProps) {
  const [timed, setTimed] = useState(false);
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const grouped = exams.reduce<Record<string, ExamSummary[]>>((acc, exam) => {
    const key = exam.cluster_name;
    acc[key] = acc[key] ?? [];
    acc[key].push(exam);
    return acc;
  }, {});

  const handleStart = (examId: string) => {
    setError("");
    startTransition(async () => {
      try {
        await startFullExam(examId, lockWindow ? true : timed);
      } catch (startError) {
        if (isRedirectError(startError)) throw startError;
        setError(startError instanceof Error ? startError.message : "Could not start this exam.");
      }
    });
  };

  if (exams.length === 0) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">No exams are available yet.</p>
      </Card>
    );
  }

  return (
    <div className="space-y-10">
      {!lockWindow ? (
        <TimedModeField
          id="full-exam-timed"
          hint="90 minutes, matching a standard DECA cluster exam. When time runs out the clock turns red and you can keep working."
          checked={timed}
          onCheckedChange={setTimed}
        />
      ) : null}

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      {Object.entries(grouped).map(([clusterName, clusterExams]) => (
        <section key={clusterName}>
          <h2 className="mb-4 text-lg font-semibold text-foreground">{clusterName}</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {clusterExams.map((exam) => {
              const locked = lockWindow && !examIsAssigned(exam, assignedClusterSlug, exams);
              return (
                <li key={exam.id}>
                  <Card className="flex h-full flex-col p-5">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="eyebrow">{exam.year}</p>
                        <h3 className="mt-1 text-[15px] font-semibold tracking-tight">
                          {exam.title}
                        </h3>
                        <p className="mt-1 text-sm text-muted-foreground">{exam.exam_code}</p>
                      </div>
                      <Badge className="tabular-nums">{exam.question_count}</Badge>
                    </div>
                    <Button
                      type="button"
                      disabled={isPending || locked || exam.question_count === 0}
                      onClick={() => handleStart(exam.id)}
                      className="mt-5"
                    >
                      {locked
                        ? "Locked"
                        : isPending
                          ? "Starting…"
                          : timed || lockWindow
                            ? "Start timed test"
                            : "Start full test"}
                    </Button>
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
