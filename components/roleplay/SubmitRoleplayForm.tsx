"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createSubmission } from "@/app/roleplay/actions";
import type { ScenarioSummary } from "@/lib/roleplay/scenario-types";
import { LEVEL_LABELS } from "@/lib/roleplay/scenario-types";
import { extractDriveFileId } from "@/lib/roleplay/types";
import {
  extractYouTubeId,
  normalizeVideoUrl,
  type VideoSource,
} from "@/lib/roleplay/video";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";

type SubmitRoleplayFormProps = {
  scenarios: ScenarioSummary[];
  initialScenarioId?: string;
};

export function SubmitRoleplayForm({
  scenarios,
  initialScenarioId = "",
}: SubmitRoleplayFormProps) {
  const [scenarioId, setScenarioId] = useState(initialScenarioId);
  const [videoSource, setVideoSource] = useState<VideoSource>("youtube");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedScenario = scenarios.find((scenario) => scenario.id === scenarioId);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    setError("");

    if (!scenarioId) {
      setError("Please select a scenario");
      return;
    }
    if (!videoUrl.trim()) {
      setError("Please enter a video URL");
      return;
    }
    if (videoSource === "youtube" && !extractYouTubeId(videoUrl)) {
      setError("Please enter a valid YouTube link");
      return;
    }
    if (videoSource === "google-drive" && !extractDriveFileId(videoUrl)) {
      setError("Please enter a valid Google Drive link");
      return;
    }

    startTransition(async () => {
      try {
        await createSubmission({
          scenarioKey: scenarioId,
          videoUrl: normalizeVideoUrl(videoUrl),
          videoSource,
        });
      } catch (submitError) {
        setError(
          submitError instanceof Error
            ? submitError.message
            : "Could not submit roleplay",
        );
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <Card className="p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-sm font-semibold text-foreground">Select scenario</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Browse the full library or pick from recent scenarios below.
            </p>
          </div>
          <Button variant="secondary" size="sm" asChild>
            <Link href="/roleplays">Browse library</Link>
          </Button>
        </div>

        {scenarios.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No scenarios loaded yet. Open the scenario library to choose one.
          </p>
        ) : (
          <div className="mt-4 space-y-2">
            {scenarios.map((scenario) => {
              const title =
                scenario.scenario_title?.trim() ||
                `${scenario.event_code} scenario ${scenario.scenario_number}`;

              return (
                <label
                  key={scenario.id}
                  className={cn(
                    "block cursor-pointer rounded-2xl border-2 p-4 transition-colors",
                    scenarioId === scenario.id
                      ? "border-primary bg-primary/10"
                      : "border-border bg-muted hover:border-border",
                  )}
                >
                  <input
                    type="radio"
                    name="scenario"
                    value={scenario.id}
                    checked={scenarioId === scenario.id}
                    onChange={(event) => setScenarioId(event.target.value)}
                    className="sr-only"
                  />
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex flex-wrap gap-2">
                        <span className="text-xs font-semibold uppercase tracking-wide text-primary">
                          {scenario.event_code}
                        </span>
                        <span className="text-xs font-medium text-muted-foreground">
                          {LEVEL_LABELS[scenario.level]} · {scenario.year}
                        </span>
                      </div>
                      <h3 className="mt-1 font-medium text-foreground">{title}</h3>
                      {scenario.preview ? (
                        <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                          {scenario.preview}
                        </p>
                      ) : null}
                    </div>
                    <Link
                      href={`/roleplays/${scenario.id}`}
                      className="shrink-0 text-xs font-medium text-primary hover:underline"
                      onClick={(event) => event.stopPropagation()}
                    >
                      View
                    </Link>
                  </div>
                </label>
              );
            })}
          </div>
        )}
      </Card>

      {selectedScenario ? (
        <Card className="p-5">
          <h4 className="text-sm font-semibold text-foreground">Selected scenario</h4>
          <p className="mt-2 text-sm text-muted-foreground">
            {selectedScenario.event_name} · {selectedScenario.cluster_name}
          </p>
        </Card>
      ) : null}

      <div>
        <Label>Video host</Label>
        <div className="mt-2 grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            [
              {
                value: "youtube" as const,
                title: "YouTube",
                description:
                  "Unlisted video. Timestamped comments sync during playback.",
              },
              {
                value: "google-drive" as const,
                title: "Google Drive",
                description:
                  'Share as "Anyone with the link." Grader enters video length.',
              },
            ] as const
          ).map((option) => (
            <label
              key={option.value}
              className={cn(
                "cursor-pointer rounded-2xl border-2 p-4 transition-colors",
                videoSource === option.value
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card hover:border-border",
              )}
            >
              <input
                type="radio"
                name="videoSource"
                value={option.value}
                checked={videoSource === option.value}
                onChange={() => setVideoSource(option.value)}
                className="sr-only"
              />
              <h3 className="text-sm font-medium text-foreground">{option.title}</h3>
              <p className="mt-1 text-xs text-muted-foreground">{option.description}</p>
            </label>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="videoUrl">
          {videoSource === "youtube" ? "YouTube URL" : "Google Drive URL"}
        </Label>
        <Input
          id="videoUrl"
          type="url"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          placeholder={
            videoSource === "youtube"
              ? "https://youtube.com/watch?v=..."
              : "https://drive.google.com/file/d/..."
          }
          className="mt-2"
        />
      </div>

      {error ? (
        <div className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {error}
        </div>
      ) : null}

      <Button type="submit" disabled={isPending} size="lg" className="w-full">
        {isPending ? "Submitting..." : "Submit roleplay"}
      </Button>
    </form>
  );
}
