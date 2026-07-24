"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { startPiTargetedTest } from "@/app/platform/actions";
import { PageHeader } from "@/components/page-header";
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

      <div className="mt-6 max-w-xs">
        <Label htmlFor="pi-targeted-count">Question count</Label>
        <select
          id="pi-targeted-count"
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

      {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

      <div className="mt-6 flex flex-wrap gap-3">
        <Button
          type="button"
          size="lg"
          disabled={isPending}
          onClick={() => {
            setError("");
            const count = Number(
              (document.getElementById("pi-targeted-count") as HTMLSelectElement)
                .value,
            );
            startTransition(async () => {
              try {
                await startPiTargetedTest(count);
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
          {isPending ? "Starting…" : "Start PI-targeted quiz"}
        </Button>
        <Button variant="secondary" size="lg" asChild>
          <Link href="/study/pis">Browse all PIs</Link>
        </Button>
      </div>
    </Card>
  );
}
