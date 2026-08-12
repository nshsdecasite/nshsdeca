import type { Metadata } from "next";
import Link from "next/link";
import { VocabFlashcards } from "@/components/vocab-flashcards";
import { getVocabFlashcards } from "@/lib/content/vocab";

export const metadata: Metadata = {
  title: "Vocab Flashcards",
};

export default async function VocabPage() {
  const { setTitle, cards, clusters } = await getVocabFlashcards();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-10 max-w-3xl">
        <Link
          href="/dashboard"
          className="text-sm font-medium text-deca-green transition-colors duration-150 hover:text-deca-green-dark"
        >
          ← Back to dashboard
        </Link>
        <p className="mt-4 text-sm font-semibold uppercase tracking-wide text-deca-green">
          Study tools
        </p>
        <h1 className="mt-2 text-3xl font-bold text-ink sm:text-4xl">
          Vocab flashcards
        </h1>
        <p className="mt-3 text-muted">
          Study terms by DECA cluster. Many cards appear in multiple clusters.
          Use the arrow keys to navigate, or Space to flip each card.
        </p>
      </div>

      <VocabFlashcards setTitle={setTitle} cards={cards} clusters={clusters} />
    </div>
  );
}
