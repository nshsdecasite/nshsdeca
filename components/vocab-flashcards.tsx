"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClusterSlug } from "@/data/vocab-clusters";
import type { VocabFlashcard } from "@/lib/content/vocab";

type VocabFlashcardsProps = {
  setTitle: string;
  cards: VocabFlashcard[];
  clusters: { slug: ClusterSlug; label: string }[];
};

function shuffleCards(cards: VocabFlashcard[]) {
  const shuffled = [...cards];
  for (let index = shuffled.length - 1; index > 0; index -= 1) {
    const swapIndex = Math.floor(Math.random() * (index + 1));
    [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
  }
  return shuffled;
}

export function VocabFlashcards({
  setTitle,
  cards,
  clusters,
}: VocabFlashcardsProps) {
  const [deck, setDeck] = useState(cards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [activeCluster, setActiveCluster] = useState<ClusterSlug | "all">("all");

  const filteredDeck = useMemo(() => {
    if (activeCluster === "all") {
      return deck;
    }
    return deck.filter((card) => card.clusterSlugs.includes(activeCluster));
  }, [activeCluster, deck]);

  const currentCard = filteredDeck[index] ?? null;

  const activeClusterLabel = useMemo(() => {
    if (activeCluster === "all") {
      return currentCard?.clusterLabels[0] ?? "All clusters";
    }
    return (
      clusters.find((cluster) => cluster.slug === activeCluster)?.label ??
      "Cluster"
    );
  }, [activeCluster, clusters, currentCard]);

  const progress =
    filteredDeck.length > 0 ? ((index + 1) / filteredDeck.length) * 100 : 0;

  const goNext = useCallback(() => {
    if (filteredDeck.length === 0) {
      return;
    }
    setFlipped(false);
    setIndex((current) => (current + 1) % filteredDeck.length);
  }, [filteredDeck.length]);

  const goPrevious = useCallback(() => {
    if (filteredDeck.length === 0) {
      return;
    }
    setFlipped(false);
    setIndex((current) =>
      current === 0 ? filteredDeck.length - 1 : current - 1,
    );
  }, [filteredDeck.length]);

  const reshuffle = useCallback(() => {
    setDeck(shuffleCards(cards));
    setIndex(0);
    setFlipped(false);
  }, [cards]);

  useEffect(() => {
    setIndex(0);
    setFlipped(false);
  }, [activeCluster]);

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        goNext();
      }
      if (event.key === "ArrowLeft") {
        goPrevious();
      }
      if (event.key === " " || event.key === "Enter") {
        event.preventDefault();
        setFlipped((value) => !value);
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [goNext, goPrevious]);

  if (cards.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-soft">
        <p className="text-sm text-muted">
          No vocabulary flashcards are available yet.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted">{setTitle}</p>
          <p className="mt-1 text-sm text-muted">
            {filteredDeck.length} card{filteredDeck.length === 1 ? "" : "s"}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={reshuffle}
            className="inline-flex min-h-10 items-center rounded-2xl bg-white px-4 text-sm font-medium text-ink shadow-soft transition-[transform,color] duration-150 hover:text-deca-green active:scale-[0.96]"
          >
            Shuffle
          </button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => setActiveCluster("all")}
          className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
            activeCluster === "all"
              ? "bg-deca-green text-white"
              : "bg-white text-muted shadow-soft hover:text-ink"
          }`}
        >
          All clusters
        </button>
        {clusters.map((cluster) => (
          <button
            key={cluster.slug}
            type="button"
            onClick={() => setActiveCluster(cluster.slug)}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
              activeCluster === cluster.slug
                ? "bg-deca-green text-white"
                : "bg-white text-muted shadow-soft hover:text-ink"
            }`}
          >
            {cluster.label}
          </button>
        ))}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-white shadow-soft">
        <div
          className="h-full rounded-full bg-deca-green transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      {currentCard ? (
        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          className="group min-h-[320px] rounded-3xl bg-white p-8 text-left shadow-soft-lg transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-[0_24px_48px_rgba(15,23,42,0.08)] active:scale-[0.995] sm:min-h-[360px] sm:p-10"
        >
          <div className="flex h-full min-h-[240px] flex-col sm:min-h-[280px]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <span className="rounded-full bg-deca-green/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-wide text-deca-green">
                {activeClusterLabel}
              </span>
              <span className="text-sm font-medium text-muted">
                {index + 1} / {filteredDeck.length}
              </span>
            </div>

            <div className="flex flex-1 items-center justify-center px-2 py-8">
              <p className="max-w-2xl text-center text-2xl font-semibold leading-snug text-ink sm:text-3xl">
                {flipped ? currentCard.definition : currentCard.term}
              </p>
            </div>

            <p className="text-center text-sm text-muted">
              {flipped ? "Showing definition" : "Showing term"} · Click or
              press Space to flip
            </p>
          </div>
        </button>
      ) : (
        <div className="rounded-3xl bg-white p-10 text-center shadow-soft">
          <p className="text-sm text-muted">No cards in this cluster yet.</p>
        </div>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <button
          type="button"
          onClick={goPrevious}
          disabled={filteredDeck.length === 0}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-white px-5 text-sm font-semibold text-ink shadow-soft transition-[transform,opacity] duration-150 hover:text-deca-green active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
        >
          ← Previous
        </button>

        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          disabled={!currentCard}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-deca-green/10 px-5 text-sm font-semibold text-deca-green transition-[transform,opacity] duration-150 hover:bg-deca-green/15 active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Flip card
        </button>

        <button
          type="button"
          onClick={goNext}
          disabled={filteredDeck.length === 0}
          className="inline-flex min-h-11 items-center justify-center rounded-2xl bg-deca-green px-5 text-sm font-semibold text-white shadow-soft transition-[background-color,transform] duration-150 hover:bg-deca-green-dark active:scale-[0.96] disabled:cursor-not-allowed disabled:opacity-50"
        >
          Next →
        </button>
      </div>
    </div>
  );
}
