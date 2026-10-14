"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  approvePracticeScenario,
  rejectPracticeScenario,
  submitPracticeScenarioForReview,
  withdrawPracticeScenarioReview,
} from "@/app/roleplay/scenario-actions";
import { DecaButton } from "@/components/deca/button";
import type { PracticeReviewStatus } from "@/lib/roleplay/scenario-types";

export function PracticeOfficerReviewButtons({
  scenarioId,
  afterRejectHref,
}: {
  scenarioId: string;
  afterRejectHref?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();

  function approve() {
    setError("");
    startTransition(async () => {
      try {
        await approvePracticeScenario(scenarioId);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not approve this event.");
      }
    });
  }

  function reject() {
    setError("");
    startTransition(async () => {
      try {
        await rejectPracticeScenario(scenarioId);
        if (afterRejectHref) {
          router.push(afterRejectHref);
          return;
        }
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not reject this event.");
      }
    });
  }

  return (
    <>
      <DecaButton type="button" size="sm" onClick={approve} disabled={pending}>
        {pending ? "Updating…" : "Approve"}
      </DecaButton>
      <DecaButton type="button" variant="outline" size="sm" onClick={reject} disabled={pending}>
        Reject
      </DecaButton>
      {error ? (
        <p className="basis-full max-w-[28ch] text-right text-sm text-[#b42318]">{error}</p>
      ) : null}
    </>
  );
}

export function GeneratedReviewActions({ scenarioId }: { scenarioId: string }) {
  return (
    <div className="mt-auto flex flex-wrap items-center gap-2">
      <DecaButton href={`/roleplays/${scenarioId}`} variant="tint" size="sm">
        Open
      </DecaButton>
      <PracticeOfficerReviewButtons scenarioId={scenarioId} />
    </div>
  );
}

export function PracticeReviewActions({
  scenarioId,
  isOwner,
  reviewStatus,
  creatorName,
  viewerIsOfficer,
}: {
  scenarioId: string;
  isOwner: boolean;
  reviewStatus: PracticeReviewStatus | null | undefined;
  creatorName?: string | null;
  viewerIsOfficer: boolean;
}) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [pending, startTransition] = useTransition();
  const pendingReview = reviewStatus === "pending_review";
  const approved = reviewStatus === "approved";

  function submit() {
    setError("");
    startTransition(async () => {
      try {
        await submitPracticeScenarioForReview(scenarioId);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not send this for review.");
      }
    });
  }

  function withdraw() {
    setError("");
    startTransition(async () => {
      try {
        await withdrawPracticeScenarioReview(scenarioId);
        router.refresh();
      } catch (caught) {
        setError(caught instanceof Error ? caught.message : "Could not withdraw this review.");
      }
    });
  }

  return (
    <div className="flex flex-col items-end gap-2">
      {approved ? (
        <span className="rounded-full bg-ever-lt px-3 py-1 text-[11px] font-extrabold text-ever-dk">
          Approved
        </span>
      ) : null}
      {isOwner && !pendingReview && !approved ? (
        <DecaButton type="button" variant="outline" onClick={submit} disabled={pending}>
          {pending ? "Sending…" : "Send to officers"}
        </DecaButton>
      ) : null}
      {isOwner && pendingReview ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <span className="rounded-full bg-gold-lt px-3 py-1 text-[11px] font-extrabold text-gold">
            Sent for review
          </span>
          <DecaButton type="button" variant="outline" size="sm" onClick={withdraw} disabled={pending}>
            {pending ? "Updating…" : "Withdraw"}
          </DecaButton>
        </div>
      ) : null}
      {!isOwner && viewerIsOfficer && pendingReview ? (
        <span className="rounded-full bg-gold-lt px-3 py-1 text-[11px] font-extrabold text-gold">
          {creatorName ? `Submitted by ${creatorName}` : "Submitted for review"}
        </span>
      ) : null}
      {viewerIsOfficer && pendingReview ? (
        <div className="flex flex-wrap items-center justify-end gap-2">
          <PracticeOfficerReviewButtons
            scenarioId={scenarioId}
            afterRejectHref={isOwner ? undefined : "/admin/generated"}
          />
        </div>
      ) : null}
      {error ? <p className="max-w-[28ch] text-right text-sm text-[#b42318]">{error}</p> : null}
    </div>
  );
}
