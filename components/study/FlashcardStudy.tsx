"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import {
  markFlashcardKnown,
  markFlashcardLearning,
} from "@/app/platform/actions";
import type { Flashcard } from "@/lib/platform/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type FlashcardStudyProps = {
  title: string;
  cards: Flashcard[];
};

type Mode = "learn" | "test" | "match";

function shuffle<T>(items: T[]) {
  const next = [...items];
  for (let index = next.length - 1; index > 0; index -= 1) {
    const swap = Math.floor(Math.random() * (index + 1));
    [next[index], next[swap]] = [next[swap], next[index]];
  }
  return next;
}

function uniqueOptions(cards: Flashcard[], current: Flashcard, count = 4) {
  const others = shuffle(cards.filter((card) => card.id !== current.id)).slice(
    0,
    count - 1,
  );
  return shuffle([current, ...others]);
}

export function FlashcardStudy({ title, cards: initialCards }: FlashcardStudyProps) {
  const [cards, setCards] = useState(initialCards);
  const [mode, setMode] = useState<Mode>("learn");
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [testScore, setTestScore] = useState(0);
  const [testAnswered, setTestAnswered] = useState(0);
  const [pickedId, setPickedId] = useState<string | null>(null);
  const [selectedFront, setSelectedFront] = useState<string | null>(null);
  const [selectedBack, setSelectedBack] = useState<string | null>(null);
  const [matchedIds, setMatchedIds] = useState<string[]>([]);
  const [mismatch, setMismatch] = useState(false);

  const current = cards[index];
  const knownCount = cards.filter((card) => card.status === "know_it").length;

  const testChoices = useMemo(() => {
    if (!current || mode !== "test") return [];
    return uniqueOptions(cards, current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [current?.id, mode]);

  const unmatched = cards.filter((card) => !matchedIds.includes(card.id));
  const matchBatch = unmatched.slice(0, 6);
  const matchFronts = useMemo(
    () => shuffle(matchBatch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matchedIds.join(","), mode],
  );
  const matchBacks = useMemo(
    () => shuffle(matchBatch),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [matchedIds.join(","), mode],
  );

  const switchMode = (next: Mode) => {
    setMode(next);
    setFlipped(false);
    setIndex(0);
    setPickedId(null);
    setTestScore(0);
    setTestAnswered(0);
    setSelectedFront(null);
    setSelectedBack(null);
    setMatchedIds([]);
    setMismatch(false);
  };

  const updateStatus = (status: "learning" | "know_it") => {
    if (!current) return;
    startTransition(async () => {
      if (status === "know_it") {
        await markFlashcardKnown(current.id);
      } else {
        await markFlashcardLearning(current.id);
      }
      setCards((prev) =>
        prev.map((card) => (card.id === current.id ? { ...card, status } : card)),
      );
      setFlipped(false);
      setIndex((value) => Math.min(value + 1, cards.length - 1));
    });
  };

  const answerTest = (choice: Flashcard) => {
    if (pickedId || !current) return;
    const correct = choice.id === current.id;
    setPickedId(choice.id);
    setTestAnswered((value) => value + 1);
    if (correct) setTestScore((value) => value + 1);
  };

  const tryMatch = (frontId: string | null, backId: string | null) => {
    if (!frontId || !backId) return;
    if (frontId === backId) {
      setMatchedIds((prev) => [...prev, frontId]);
      setSelectedFront(null);
      setSelectedBack(null);
      setMismatch(false);
    } else {
      setMismatch(true);
      window.setTimeout(() => {
        setSelectedFront(null);
        setSelectedBack(null);
        setMismatch(false);
      }, 600);
    }
  };

  if (!current && mode !== "match") {
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
      <div className="flex flex-wrap gap-2">
        {(["learn", "test", "match"] as const).map((item) => (
          <Button
            key={item}
            type="button"
            size="sm"
            variant={mode === item ? "default" : "secondary"}
            onClick={() => switchMode(item)}
            className="capitalize"
          >
            {item}
          </Button>
        ))}
      </div>

      <Card className="p-5">
        <p className="text-sm text-muted-foreground">
          {title} · {knownCount}/{cards.length} known
        </p>
        {mode === "learn" ? (
          <p className="mt-1 text-sm font-medium tabular-nums text-foreground">
            Card {index + 1} of {cards.length}
          </p>
        ) : null}
        {mode === "test" ? (
          <p className="mt-1 text-sm font-medium tabular-nums text-foreground">
            Score {testScore}/{testAnswered || 0}
          </p>
        ) : null}
        {mode === "match" ? (
          <p className="mt-1 text-sm font-medium tabular-nums text-foreground">
            Matched {matchedIds.length}/{cards.length}
          </p>
        ) : null}
      </Card>

      {mode === "learn" && current ? (
        <>
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
                  className="mt-6 text-sm font-medium text-primary"
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
        </>
      ) : null}

      {mode === "test" && current ? (
        <Card className="p-6">
          {testAnswered >= cards.length && !pickedId ? (
            <div className="text-center">
              <p className="text-lg font-semibold">Set complete</p>
              <p className="mt-1 text-sm text-muted-foreground">
                You got {testScore} of {cards.length} correct.
              </p>
              <Button type="button" className="mt-4" onClick={() => switchMode("test")}>
                Retry
              </Button>
            </div>
          ) : (
            <>
              <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                What does this PI mean?
              </p>
              <p className="mt-3 text-lg font-semibold">{current.front_text}</p>
              <div className="mt-5 space-y-2">
                {testChoices.map((choice) => {
                  const selected = pickedId === choice.id;
                  const correct = pickedId && choice.id === current.id;
                  const wrong = selected && choice.id !== current.id;
                  return (
                    <button
                      key={choice.id}
                      type="button"
                      disabled={Boolean(pickedId)}
                      onClick={() => answerTest(choice)}
                      className={cn(
                        "w-full rounded-lg px-4 py-3 text-left text-sm shadow-border",
                        correct && "bg-primary/10 text-primary",
                        wrong && "bg-red-50 text-red-800",
                      )}
                    >
                      {choice.back_text}
                    </button>
                  );
                })}
              </div>
              {pickedId ? (
                <Button
                  type="button"
                  className="mt-5"
                  onClick={() => {
                    setPickedId(null);
                    if (index >= cards.length - 1) return;
                    setIndex((value) => value + 1);
                  }}
                >
                  {index >= cards.length - 1 ? "See score" : "Next"}
                </Button>
              ) : null}
            </>
          )}
        </Card>
      ) : null}

      {mode === "match" ? (
        matchedIds.length === cards.length ? (
          <Card className="p-8 text-center">
            <p className="text-lg font-semibold">All matched</p>
            <Button type="button" className="mt-4" onClick={() => switchMode("match")}>
              Play again
            </Button>
          </Card>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              {matchFronts.map((card) => (
                <button
                  key={`f-${card.id}`}
                  type="button"
                  onClick={() => {
                    const next = selectedFront === card.id ? null : card.id;
                    setSelectedFront(next);
                    tryMatch(next, selectedBack);
                  }}
                  className={cn(
                    "w-full rounded-lg px-4 py-3 text-left text-sm shadow-border",
                    selectedFront === card.id && "bg-primary/10 text-primary",
                    mismatch && selectedFront === card.id && "bg-red-50 text-red-800",
                  )}
                >
                  {card.front_text}
                </button>
              ))}
            </div>
            <div className="space-y-2">
              {matchBacks.map((card) => (
                <button
                  key={`b-${card.id}`}
                  type="button"
                  onClick={() => {
                    const next = selectedBack === card.id ? null : card.id;
                    setSelectedBack(next);
                    tryMatch(selectedFront, next);
                  }}
                  className={cn(
                    "w-full rounded-lg px-4 py-3 text-left text-sm shadow-border",
                    selectedBack === card.id && "bg-primary/10 text-primary",
                    mismatch && selectedBack === card.id && "bg-red-50 text-red-800",
                  )}
                >
                  {card.back_text}
                </button>
              ))}
            </div>
          </div>
        )
      ) : null}

      <Link href="/study/flashcards" className="inline-block text-sm text-primary">
        ← All flashcard sets
      </Link>
    </div>
  );
}
