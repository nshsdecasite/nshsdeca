import type { Metadata } from "next";
import Link from "next/link";
import { VisualLibrary } from "@/components/visual-library";

export const metadata: Metadata = {
  title: "Visual Reference Library",
};

export default function VisualsPage() {
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
          Visual reference library
        </h1>
        <p className="mt-3 text-muted">
          Charts, matrices, and concept diagrams for roleplays and tests. Click
          any card to expand the full visual.
        </p>
      </div>

      <VisualLibrary />
    </div>
  );
}
