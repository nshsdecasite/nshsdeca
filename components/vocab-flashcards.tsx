"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClusterSlug } from "@/data/vocab-clusters";
import type { VocabFlashcard } from "@/lib/content/vocab";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

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
      <Card className="p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No vocabulary flashcards are available yet.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div>
          <p className="text-sm font-medium text-muted-foreground">{setTitle}</p>
          <p className="mt-1 text-sm text-muted-foreground">
            {filteredDeck.length} card{filteredDeck.length === 1 ? "" : "s"}
          </p>
        </div>
        <Button type="button" variant="secondary" onClick={reshuffle}>
          Shuffle
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeCluster === "all" ? "default" : "secondary"}
          className="rounded-full"
          onClick={() => setActiveCluster("all")}
        >
          All clusters
        </Button>
        {clusters.map((cluster) => (
          <Button
            key={cluster.slug}
            type="button"
            size="sm"
            variant={activeCluster === cluster.slug ? "default" : "secondary"}
            className="rounded-full"
            onClick={() => setActiveCluster(cluster.slug)}
          >
            {cluster.label}
          </Button>
        ))}
      </div>

      <div className="h-2 overflow-hidden rounded-full bg-secondary">
        <div
          className="h-full rounded-full bg-primary transition-[width] duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      {currentCard ? (
        <button
          type="button"
          onClick={() => setFlipped((value) => !value)}
          className="group min-h-[320px] rounded-2xl border border-border/60 bg-card p-8 text-left shadow-border-hover transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 active:scale-[0.995] sm:min-h-[360px] sm:p-10"
        >
          <div className="flex h-full min-h-[240px] flex-col sm:min-h-[280px]">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
              <Badge>{activeClusterLabel}</Badge>
              <span className="text-sm font-medium tabular-nums text-muted-foreground">
                {index + 1} / {filteredDeck.length}
              </span>
            </div>

            <div className="flex flex-1 items-center justify-center px-2 py-8">
              <p className="max-w-2xl text-center text-2xl font-semibold leading-snug text-foreground sm:text-3xl">
                {flipped ? currentCard.definition : currentCard.term}
              </p>
            </div>

            <p className="text-center text-sm text-muted-foreground">
              {flipped ? "Showing definition" : "Showing term"} · Click or
              press Space to flip
            </p>
          </div>
        </button>
      ) : (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">No cards in this cluster yet.</p>
        </Card>
      )}

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <Button
          type="button"
          variant="secondary"
          onClick={goPrevious}
          disabled={filteredDeck.length === 0}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={() => setFlipped((value) => !value)}
          disabled={!currentCard}
        >
          Flip card
        </Button>
        <Button
          type="button"
          onClick={goNext}
          disabled={filteredDeck.length === 0}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
