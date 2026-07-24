"use client";

import { useTransition } from "react";
import { startFullExam } from "@/app/test/actions";
import type { ExamSummary } from "@/lib/test/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type ExamPickerProps = {
  exams: ExamSummary[];
};

export function ExamPicker({ exams }: ExamPickerProps) {
  const [isPending, startTransition] = useTransition();
  const grouped = exams.reduce<Record<string, ExamSummary[]>>((acc, exam) => {
    const key = exam.cluster_name;
    acc[key] = acc[key] ?? [];
    acc[key].push(exam);
    return acc;
  }, {});

  const handleStart = (examId: string) => {
    startTransition(async () => {
      await startFullExam(examId);
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
      {Object.entries(grouped).map(([clusterName, clusterExams]) => (
        <section key={clusterName}>
          <h2 className="mb-4 text-lg font-semibold text-foreground">{clusterName}</h2>
          <ul className="grid gap-4 sm:grid-cols-2">
            {clusterExams.map((exam) => (
              <li key={exam.id}>
                <Card className="flex h-full flex-col p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                        {exam.year}
                      </p>
                      <h3 className="mt-1 text-base font-semibold text-foreground">
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
                    {isPending ? "Starting…" : "Start full test"}
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
