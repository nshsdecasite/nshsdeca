"use client";

import { useState, useTransition } from "react";
import { startCustomTest } from "@/app/platform/actions";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type CustomTestFormProps = {
  clusters: { slug: string; name: string }[];
  instructionalAreas: { code: string; name: string }[];
};

export function CustomTestForm({
  clusters,
  instructionalAreas,
}: CustomTestFormProps) {
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  return (
    <Card className="p-6 sm:p-8">
      <form
        onSubmit={(event) => {
          event.preventDefault();
          setError("");
          const formData = new FormData(event.currentTarget);
          startTransition(async () => {
            try {
              await startCustomTest({
                questionCount: Number(formData.get("questionCount")),
                clusterSlug: String(formData.get("cluster") ?? "") || undefined,
                iaCode: String(formData.get("ia") ?? "") || undefined,
              });
            } catch (startError) {
              setError(
                startError instanceof Error
                  ? startError.message
                  : "Could not start custom test",
              );
            }
          });
        }}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="questionCount">Question count</Label>
            <select
              id="questionCount"
              name="questionCount"
              defaultValue="20"
              className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              {[10, 20, 30, 50, 100].map((count) => (
                <option key={count} value={count}>
                  {count} questions
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="cluster">Cluster</Label>
            <select
              id="cluster"
              name="cluster"
              defaultValue=""
              className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All clusters</option>
              {clusters.map((cluster) => (
                <option key={cluster.slug} value={cluster.slug}>
                  {cluster.name}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <Label htmlFor="ia">Instructional area</Label>
            <select
              id="ia"
              name="ia"
              defaultValue=""
              className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All instructional areas</option>
              {instructionalAreas.map((area) => (
                <option key={area.code} value={area.code}>
                  {area.code} — {area.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={isPending} size="lg" className="mt-6">
          {isPending ? "Starting…" : "Start custom test"}
        </Button>
      </form>
    </Card>
  );
}
