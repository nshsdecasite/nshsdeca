"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import {
  markFlashcardKnown,
  markFlashcardLearning,
} from "@/app/platform/actions";
import type { Flashcard } from "@/lib/platform/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type FlashcardStudyProps = {
  setId: string;
  title: string;
  cards: Flashcard[];
};

export function FlashcardStudy({ setId, title, cards: initialCards }: FlashcardStudyProps) {
  const [cards, setCards] = useState(initialCards);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isPending, startTransition] = useTransition();

  const current = cards[index];
  const knownCount = cards.filter((card) => card.status === "know_it").length;

  const updateStatus = (status: "learning" | "know_it") => {
    if (!current) return;
    startTransition(async () => {
      if (status === "know_it") {
        await markFlashcardKnown(current.id);
      } else {
        await markFlashcardLearning(current.id);
      }
      setCards((prev) =>
        prev.map((card) =>
          card.id === current.id ? { ...card, status } : card,
        ),
      );
      setFlipped(false);
      setIndex((value) => Math.min(value + 1, cards.length - 1));
    });
  };

  if (!current) {
    return (
      <Card className="p-8 text-center">
        <p className="text-muted-foreground">This set has no cards yet.</p>
        <Link href="/study/flashcards" className="mt-4 inline-block text-sm text-primary">
          ← Back to sets
        </Link>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="p-5">
        <p className="text-sm text-muted-foreground">
          {title} · {knownCount}/{cards.length} known
        </p>
        <p className="mt-1 text-sm font-medium text-foreground tabular-nums">
          Card {index + 1} of {cards.length}
        </p>
      </Card>

      <button
        type="button"
        onClick={() => setFlipped((value) => !value)}
        className="block w-full text-center"
      >
        <Card className="flex min-h-64 w-full flex-col items-center justify-center p-8 text-center transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-border-hover">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary">
            {flipped ? "Definition" : "PI code"}
          </p>
          <p className="mt-4 max-w-2xl text-lg font-medium leading-relaxed text-foreground">
            {flipped ? current.back_text : current.front_text}
          </p>
          {current.pi_id ? (
            <Link
              href={`/study/pis/${current.pi_id}`}
              onClick={(event) => event.stopPropagation()}
              className="mt-6 text-sm font-medium text-primary hover:text-primary"
            >
              View PI details →
            </Link>
          ) : null}
        </Card>
      </button>

      <div className="flex flex-wrap gap-3">
        <Button
          type="button"
          variant="secondary"
          disabled={isPending}
          onClick={() => updateStatus("learning")}
        >
          Still learning
        </Button>
        <Button
          type="button"
          disabled={isPending}
          onClick={() => updateStatus("know_it")}
        >
          Know it
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setFlipped(false);
            setIndex((value) => Math.max(0, value - 1));
          }}
          disabled={index === 0}
        >
          Previous
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={() => {
            setFlipped(false);
            setIndex((value) => Math.min(cards.length - 1, value + 1));
          }}
          disabled={index >= cards.length - 1}
        >
          Next
        </Button>
      </div>

      <Link href="/study/flashcards" className="inline-block text-sm text-primary">
        ← All flashcard sets
      </Link>
    </div>
  );
}
