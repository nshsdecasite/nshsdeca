"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { startPiTargetedTest } from "@/app/platform/actions";
import { TimedModeField } from "@/components/test/TimedModeField";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type PiTargetedLauncherProps = {
  weakPiCount: number;
};

export function PiTargetedLauncher({ weakPiCount }: PiTargetedLauncherProps) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="p-8">
      <p className="text-sm leading-relaxed text-muted-foreground">
        {weakPiCount > 0
          ? `You have ${weakPiCount} weak PI${weakPiCount === 1 ? "" : "s"} tracked from past tests. This quiz pulls questions from your lowest-accuracy indicators first.`
          : "Take a few practice tests first and this mode will automatically focus on the PIs you miss most often. For now, you'll get a mixed review quiz."}
      </p>

      <form
        className="mt-6 space-y-4"
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            try {
              await startPiTargetedTest(
                Number(formData.get("questionCount") ?? 15),
                formData.get("timed") === "on",
              );
            } catch (startError) {
              setError(
                startError instanceof Error
                  ? startError.message
                  : "Could not start PI-targeted test",
              );
            }
          });
        }}
      >
        <div className="max-w-xs">
          <Label htmlFor="pi-targeted-count">Question count</Label>
          <select
            id="pi-targeted-count"
            name="questionCount"
            defaultValue="15"
            className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
          >
            {[10, 15, 20, 30].map((count) => (
              <option key={count} value={count}>
                {count} questions
              </option>
            ))}
          </select>
        </div>

        <TimedModeField
          id="pi-targeted-timed"
          hint="About 54 seconds per question. The quiz submits automatically when time runs out."
        />

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <Button type="submit" size="lg" disabled={isPending}>
            {isPending ? "Starting…" : "Start PI-targeted quiz"}
          </Button>
          <Button variant="secondary" size="lg" asChild>
            <Link href="/study/pis">Browse all PIs</Link>
          </Button>
        </div>
      </form>
    </Card>
  );
}
