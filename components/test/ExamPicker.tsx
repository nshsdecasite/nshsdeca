"use client";

import { useState, useTransition } from "react";
import { startFullExam } from "@/app/test/actions";
import { TimedModeField } from "@/components/test/TimedModeField";
import type { ExamSummary } from "@/lib/test/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ExamPickerProps = {
  exams: ExamSummary[];
};

export function ExamPicker({ exams }: ExamPickerProps) {
  const [timed, setTimed] = useState(false);
  const [isPending, startTransition] = useTransition();
  const grouped = exams.reduce<Record<string, ExamSummary[]>>((acc, exam) => {
    const key = exam.cluster_name;
    acc[key] = acc[key] ?? [];
    acc[key].push(exam);
    return acc;
  }, {});

  const handleStart = (examId: string) => {
    startTransition(async () => {
      await startFullExam(examId, timed);
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
      <TimedModeField
        id="full-exam-timed"
        hint="90 minutes, matching a standard DECA cluster exam. The test submits when time runs out."
        checked={timed}
        onCheckedChange={setTimed}
      />

      {Object.entries(grouped).map(([clusterName, clusterExams]) => (
        <section key={clusterName}>
          <h2 className="mb-4 text-lg font-semibold text-foreground">{clusterName}</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {clusterExams.map((exam) => (
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
                    disabled={isPending || exam.question_count === 0}
                    onClick={() => handleStart(exam.id)}
                    className="mt-5"
                  >
                    {isPending ? "Starting…" : timed ? "Start timed test" : "Start full test"}
                  </Button>
                </Card>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
