import type { Metadata } from "next";
import Link from "next/link";
import { TheoryLibrary } from "@/components/theory-library";
import { getTheories } from "@/lib/content/theories";

export const metadata: Metadata = {
  title: "Theories & Fallacies",
};

export default async function TheoriesPage() {
  const { theories, categories, clusters } = await getTheories();

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
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
          Theories & fallacies
        </h1>
        <p className="mt-3 text-muted">
          Motivational frameworks, psychological principles, and logical
          fallacies organized by DECA cluster. Click any card to read the full
          explanation and example scenario.
        </p>
      </div>

      <TheoryLibrary
        theories={theories}
        categories={categories}
        clusters={clusters}
      />
    </div>
  );
}
