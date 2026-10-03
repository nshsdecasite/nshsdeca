"use client";

import { useEffect, useState, useTransition } from "react";
import { startCustomTest } from "@/app/platform/actions";
import { searchPisForTest } from "@/app/study/actions";
import { TimedModeField } from "@/components/test/TimedModeField";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PiOption = {
  id: string;
  pi_code: string;
  indicator_text: string;
  question_count: number;
};

type CustomTestFormProps = {
  clusters: { slug: string; name: string }[];
  instructionalAreas: { code: string; name: string }[];
};

export function CustomTestForm({ clusters, instructionalAreas }: CustomTestFormProps) {
  const [error, setError] = useState("");
  const [piQuery, setPiQuery] = useState("");
  const [matchingPis, setMatchingPis] = useState<PiOption[]>([]);
  const [piLoading, setPiLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    const query = piQuery.trim();
    if (query.length < 2) {
      setMatchingPis([]);
      return;
    }

    setPiLoading(true);
    const timer = window.setTimeout(() => {
      searchPisForTest(query)
        .then(setMatchingPis)
        .catch(() => setMatchingPis([]))
        .finally(() => setPiLoading(false));
    }, 250);

    return () => window.clearTimeout(timer);
  }, [piQuery]);

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
                piId: String(formData.get("piId") ?? "") || undefined,
                timed: formData.get("timed") === "on",
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

          <div className="sm:col-span-2">
            <Label htmlFor="pi-search">Performance indicator (optional)</Label>
            <Input
              id="pi-search"
              type="search"
              value={piQuery}
              onChange={(event) => setPiQuery(event.target.value)}
              placeholder="Type at least 2 characters to search PIs…"
              className="mt-2"
            />
            <select
              id="piId"
              name="piId"
              defaultValue=""
              className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">
                {piLoading
                  ? "Searching…"
                  : piQuery.trim().length < 2
                    ? "All PIs in selected filters"
                    : matchingPis.length
                      ? "Pick a PI (optional)"
                      : "No matching PIs with questions"}
              </option>
              {matchingPis.map((pi) => (
                <option key={pi.id} value={pi.id}>
                  {pi.pi_code} — {pi.indicator_text.slice(0, 80)}
                  {pi.indicator_text.length > 80 ? "…" : ""} ({pi.question_count})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mt-4">
          <TimedModeField
            id="custom-test-timed"
            hint="About 54 seconds per question — the same pace as a 100-question, 90-minute exam."
          />
        </div>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={isPending} size="lg" className="mt-6">
          {isPending ? "Starting…" : "Start custom test"}
        </Button>
      </form>
    </Card>
  );
}
