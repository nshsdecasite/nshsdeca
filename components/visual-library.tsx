"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  visualCategories,
  visuals,
  type VisualCategory,
  type VisualItem,
} from "@/data/visuals";

function VisualPreview({ visual }: { visual: VisualItem }) {
  if (visual.type === "svg") {
    return (
      <div className="relative flex h-44 items-center justify-center bg-white p-4">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={visual.src}
          alt={visual.title}
          className="max-h-full w-auto object-contain"
        />
      </div>
    );
  }

  return (
    <div className="relative h-44 overflow-hidden bg-[#f4f8f4]">
      <iframe
        src={visual.src}
        title={visual.title}
        className="pointer-events-none absolute left-1/2 top-0 h-[520px] w-[640px] origin-top -translate-x-1/2 scale-[0.34] border-0"
        tabIndex={-1}
        loading="lazy"
      />
    </div>
  );
}

function VisualExpanded({ visual }: { visual: VisualItem }) {
  if (visual.type === "svg") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center bg-white p-6 sm:p-10">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={visual.src}
          alt={visual.title}
          className="h-auto max-h-[70vh] w-full object-contain"
        />
      </div>
    );
  }

  return (
    <iframe
      src={visual.src}
      title={visual.title}
      className="h-[min(75vh,720px)] w-full border-0 bg-[#f4f8f4]"
    />
  );
}

export function VisualLibrary() {
  const [selected, setSelected] = useState<VisualItem | null>(null);
  const [activeCategory, setActiveCategory] = useState<VisualCategory | "All">(
    "All",
  );
  const [query, setQuery] = useState("");

  const filtered = useMemo(() => {
    const normalizedQuery = query.trim().toLowerCase();

    return visuals.filter((visual) => {
      const matchesCategory =
        activeCategory === "All" || visual.category === activeCategory;
      const matchesQuery =
        !normalizedQuery ||
        visual.title.toLowerCase().includes(normalizedQuery) ||
        visual.category.toLowerCase().includes(normalizedQuery);

      return matchesCategory && matchesQuery;
    });
  }, [activeCategory, query]);

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

  return (
    <>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setActiveCategory("All")}
            className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
              activeCategory === "All"
                ? "bg-deca-green text-white"
                : "bg-white text-muted shadow-soft hover:text-ink"
            }`}
          >
            All
          </button>
          {visualCategories.map((category) => (
            <button
              key={category}
              type="button"
              onClick={() => setActiveCategory(category)}
              className={`rounded-full px-3.5 py-1.5 text-sm font-medium transition-[background-color,color,transform] duration-150 active:scale-[0.97] ${
                activeCategory === category
                  ? "bg-deca-green text-white"
                  : "bg-white text-muted shadow-soft hover:text-ink"
              }`}
            >
              {category}
            </button>
          ))}
        </div>

        <label className="relative w-full sm:max-w-xs">
          <span className="sr-only">Search visuals</span>
          <input
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search visuals…"
            className="min-h-11 w-full rounded-2xl bg-white px-4 text-sm text-ink shadow-soft outline-none transition-[box-shadow] duration-150 focus:shadow-[0_0_0_3px_rgba(45,106,45,0.18)]"
          />
        </label>
      </div>

      <p className="text-sm text-muted">
        {filtered.length} visual{filtered.length === 1 ? "" : "s"}
      </p>

      <ul className="grid gap-5 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((visual) => (
          <li key={visual.id}>
            <button
              type="button"
              onClick={() => setSelected(visual)}
              className="group flex h-full w-full flex-col overflow-hidden rounded-3xl bg-white text-left shadow-soft transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-soft-lg active:scale-[0.99]"
            >
              <VisualPreview visual={visual} />
              <div className="flex flex-1 flex-col gap-2 p-5">
                <span className="text-[11px] font-semibold uppercase tracking-wide text-deca-green">
                  {visual.category}
                </span>
                <h2 className="text-base font-semibold text-ink group-hover:text-deca-green">
                  {visual.title}
                </h2>
                <span className="mt-auto text-xs text-muted">
                  Click to expand
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <div className="rounded-3xl bg-white p-10 text-center shadow-soft">
          <p className="text-sm text-muted">
            No visuals match your search. Try another category or keyword.
          </p>
        </div>
      ) : null}

      {selected ? (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-labelledby="visual-modal-title"
        >
          <button
            type="button"
            aria-label="Close visual"
            onClick={closeModal}
            className="absolute inset-0 bg-ink/55 backdrop-blur-[2px]"
          />

          <div className="relative z-10 flex max-h-[92vh] w-full max-w-5xl flex-col overflow-hidden rounded-3xl bg-white shadow-soft-lg">
            <div className="flex items-start justify-between gap-4 border-b border-deca-green/10 px-5 py-4 sm:px-6">
              <div>
                <p className="text-[11px] font-semibold uppercase tracking-wide text-deca-green">
                  {selected.category}
                </p>
                <h2
                  id="visual-modal-title"
                  className="mt-1 text-xl font-bold text-ink"
                >
                  {selected.title}
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

            <div className="overflow-auto">
              <VisualExpanded visual={selected} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
