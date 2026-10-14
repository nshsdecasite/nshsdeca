"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approvePracticeScenario,
  rejectPracticeScenario,
} from "@/app/roleplay/scenario-actions";
import { DecaButton } from "@/components/deca/button";
import type { PracticeReviewQueueItem } from "@/lib/roleplay/scenario-types";

export function GeneratedReviewCard({ item }: { item: PracticeReviewQueueItem }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const title = item.scenario_title?.trim() || `${item.event_code} practice event`;

  function run(action: () => Promise<void>, fallback: string) {
    setError("");
    startTransition(async () => {
      try {
        await action();
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : fallback);
      }
    });
  }

  return (
    <div className="deca-card flex flex-col px-7 py-[26px]">
      <span className="w-fit rounded-full bg-gold-lt px-3 py-1 text-[11px] font-extrabold text-gold">
        {item.event_code} · {item.year}
      </span>
      <h2 className="mt-4 font-display text-xl font-extrabold tracking-[-0.02em] text-balance">
        {title}
      </h2>
      <p className="mt-2 mb-5 flex-1 text-pretty text-[13px] leading-[1.55] text-ink-2 line-clamp-4">
        {item.preview?.trim() || item.event_name}
      </p>
      <p className="mb-4 text-[12px] font-bold text-mute">
        {item.creator_name ? `From ${item.creator_name}` : "Submitted by a member"}
      </p>
      <div className="mt-auto flex flex-wrap gap-2">
        <DecaButton href={`/roleplays/${item.id}`} variant="tint" size="sm">
          Open
        </DecaButton>
        <DecaButton
          type="button"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => approvePracticeScenario(item.id), "Could not approve this event.")
          }
        >
          {pending ? "Updating…" : "Approve"}
        </DecaButton>
        <DecaButton
          type="button"
          variant="outline"
          size="sm"
          disabled={pending}
          onClick={() =>
            run(() => rejectPracticeScenario(item.id), "Could not reject this event.")
          }
        >
          Reject
        </DecaButton>
      </div>
      {error ? <p className="mt-3 text-sm text-[#b42318]">{error}</p> : null}
    </div>
  );
}
