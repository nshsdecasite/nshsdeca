"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { ClusterSlug } from "@/data/vocab-clusters";
import type { TheoryCategory } from "@/data/theories";
import type { Theory } from "@/lib/content/theories";

type TheoryLibraryProps = {
  theories: Theory[];
  categories: { value: TheoryCategory; label: string }[];
  clusters: { slug: ClusterSlug; label: string }[];
};

export function TheoryLibrary({
  theories,
  categories,
  clusters,
}: TheoryLibraryProps) {
  const [selected, setSelected] = useState<Theory | null>(null);
  const [activeCategory, setActiveCategory] = useState<TheoryCategory | "all">(
    "all",
  );
  const [activeCluster, setActiveCluster] = useState<ClusterSlug | "all">(
    "all",
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return theories.filter((theory) => {
      const matchesCategory =
        activeCategory === "all" || theory.category === activeCategory;
      const matchesCluster =
        activeCluster === "all" || theory.clusterSlug === activeCluster;
      const matchesQuery =
        !normalizedQuery ||
        theory.theoryName.toLowerCase().includes(normalizedQuery) ||
        theory.categoryLabel.toLowerCase().includes(normalizedQuery) ||
        theory.clusterLabel.toLowerCase().includes(normalizedQuery) ||
        theory.explanation.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesCluster && matchesQuery;
    });
  }, [activeCategory, activeCluster, query, theories]);

  const closeModal = useCallback(() => setSelected(null), []);

  useEffect(() => {
    if (!selected) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closeModal();
      }
    };

    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [closeModal, selected]);

  if (theories.length === 0) {
    return (
      <div className="rounded-3xl bg-white p-10 text-center shadow-soft">
        <p className="text-sm text-muted">
          No theories are available yet. Check back soon.
        </p>
      </div>
    );
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("all")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
              activeCategory === "all"
                ? "bg-deca-green text-white"
                : "bg-white text-muted shadow-soft hover:text-ink"
            }`}
          >
            All types
          </button>
          {categories.map((category) => (
            <button
              key={category.value}
              type="button"
              onClick={() => setActiveCategory(category.value)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                activeCategory === category.value
                  ? "bg-deca-green text-white"
                  : "bg-white text-muted shadow-soft hover:text-ink"
              }`}
            >
              {category.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCluster("all")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
              activeCluster === "all"
                ? "bg-ink text-white"
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
                  ? "bg-ink text-white"
                  : "bg-white text-muted shadow-soft hover:text-ink"
              }`}
            >
              {cluster.label}
            </button>
          ))}
        </div>

        <label className="relative w-full sm:max-w-md">
          <span className="sr-only">Search theories</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search theories…"
            className="min-h-11 w-full rounded-2xl bg-white px-4 text-sm text-ink shadow-soft outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_3px_rgba(45,106,45,0.18)]"
          />
        </label>
      </div>

      <p className="text-sm text-muted">
        {filtered.length} theor{filtered.length === 1 ? "y" : "ies"}
      </p>

      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((theory) => (
          <li key={theory.id}>
            <button
              type="button"
              onClick={() => setSelected(theory)}
              className="group flex h-full w-full flex-col rounded-3xl bg-white p-5 text-left shadow-soft transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-soft-lg active:scale-[0.99]"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <span className="rounded-full bg-deca-green/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-deca-green">
                  {theory.categoryLabel}
                </span>
                <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-muted">
                  {theory.clusterLabel}
                </span>
              </div>
              <h2 className="text-base font-semibold text-ink group-hover:text-deca-green">
                {theory.theoryName}
              </h2>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted">
                {theory.explanation}
              </p>
              <span className="mt-4 text-xs text-muted">Click to read more</span>
            </button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-soft">
          <p className="text-sm text-muted">
            No theories match your filters. Try another category, cluster, or
            keyword.
          </p>
        </div>
      ) : null}

      {selected ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="theory-modal-title"
        >
          <button
            type="button"
            aria-label="Close theory"
            onClick={closeModal}
            className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
          />

          <div className="relative z-10 flex max-h-[92vh] w-full max-w-3xl flex-col overflow-hidden rounded-3xl bg-white shadow-soft-lg">
            <div className="flex items-start justify-between gap-4 border-b border-deca-green/10 px-5 py-4 sm:px-6">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded-full bg-deca-green/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-deca-green">
                    {selected.categoryLabel}
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold text-muted">
                    {selected.clusterLabel}
                  </span>
                </div>
                <h2
                  id="theory-modal-title"
                  className="mt-2 text-xl font-bold text-ink sm:text-2xl"
                >
                  {selected.theoryName}
                </h2>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="inline-flex min-h-10 min-w-10 items-center justify-center rounded-xl text-muted transition-[color,background-color,transform] duration-150 hover:bg-surface hover:text-ink active:scale-[0.96]"
                aria-label="Close"
              >
                <span className="text-2xl leading-none">×</span>
              </button>
            </div>

            <div className="overflow-auto px-5 py-5 sm:px-6 sm:py-6">
              <section>
                <h3 className="text-sm font-semibold uppercase tracking-wide text-deca-green">
                  Explanation
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink sm:text-base">
                  {selected.explanation}
                </p>
              </section>

              <section className="mt-6 rounded-2xl bg-surface p-4 sm:p-5">
                <h3 className="text-sm font-semibold uppercase tracking-wide text-deca-green">
                  Example scenario
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink sm:text-base">
                  {selected.exampleScenario}
                </p>
              </section>
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
