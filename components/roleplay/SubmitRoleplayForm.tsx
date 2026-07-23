"use client";

import { useState, useTransition } from "react";
import { createSubmission } from "@/app/roleplay/actions";
import { SCENARIOS } from "@/lib/roleplay/scenarios";
import { extractDriveFileId } from "@/lib/roleplay/types";
import {
  extractYouTubeId,
  normalizeVideoUrl,
  type VideoSource,
} from "@/lib/roleplay/video";

export function SubmitRoleplayForm() {
  const [scenarioId, setScenarioId] = useState("");
  const [videoSource, setVideoSource] = useState<VideoSource>("youtube");
  const [videoUrl, setVideoUrl] = useState("");
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const selectedScenario = SCENARIOS.find((scenario) => scenario.id === scenarioId);

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
      <div>
        <label className="block text-sm font-medium text-ink mb-2">
          Select scenario
        </label>
        <div className="space-y-2">
          {SCENARIOS.map((scenario) => (
            <label
              key={scenario.id}
              className={`block p-4 rounded-2xl border-2 cursor-pointer transition-colors ${
                scenarioId === scenario.id
                  ? "border-deca-green bg-deca-green-light"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
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
                  <span className="text-xs font-medium text-deca-green">
                    {scenario.event}
                  </span>
                  <h3 className="font-medium text-ink">{scenario.title}</h3>
                  <p className="text-sm text-muted mt-1">{scenario.description}</p>
                </div>
                <span className="text-xs text-muted font-mono shrink-0">
                  {scenario.id}
                </span>
              </div>
            </label>
          ))}
        </div>
      </div>

      {selectedScenario && (
        <div className="bg-white rounded-2xl border border-slate-200 p-4">
          <h4 className="text-sm font-medium text-ink mb-2">
            Performance indicators
          </h4>
          <ul className="space-y-1">
            {selectedScenario.pis.map((pi, index) => (
              <li key={pi} className="text-sm text-muted flex gap-2">
                <span className="text-deca-green font-medium shrink-0">
                  PI {index + 1}:
                </span>
                {pi}
              </li>
            ))}
          </ul>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-ink mb-2">
          Video host
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
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
              className={`p-4 rounded-2xl border-2 cursor-pointer transition-colors ${
                videoSource === option.value
                  ? "border-deca-green bg-deca-green-light"
                  : "border-slate-200 hover:border-slate-300 bg-white"
              }`}
            >
              <input
                type="radio"
                name="videoSource"
                value={option.value}
                checked={videoSource === option.value}
                onChange={() => setVideoSource(option.value)}
                className="sr-only"
              />
              <h3 className="font-medium text-ink text-sm">{option.title}</h3>
              <p className="text-xs text-muted mt-1">{option.description}</p>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="videoUrl" className="block text-sm font-medium text-ink mb-2">
          {videoSource === "youtube" ? "YouTube URL" : "Google Drive URL"}
        </label>
        <input
          id="videoUrl"
          type="url"
          value={videoUrl}
          onChange={(event) => setVideoUrl(event.target.value)}
          placeholder={
            videoSource === "youtube"
              ? "https://youtube.com/watch?v=..."
              : "https://drive.google.com/file/d/..."
          }
          className="w-full border border-slate-300 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-deca-green focus:border-transparent bg-white"
        />
      </div>

      {error && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-xl">
          {error}
        </div>
      )}

      <button
        type="submit"
        disabled={isPending}
        className="w-full bg-deca-green text-white font-medium py-2.5 rounded-2xl hover:bg-deca-green-dark transition-colors disabled:opacity-50"
      >
        {isPending ? "Submitting..." : "Submit roleplay"}
      </button>
    </form>
  );
}
