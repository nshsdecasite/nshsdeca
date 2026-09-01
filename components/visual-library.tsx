"use client";

import { useMemo, useState } from "react";
import {
  visualCategories,
  visuals,
  type VisualCategory,
  type VisualItem,
} from "@/data/visuals";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";

function VisualPreview({ visual }: { visual: VisualItem }) {
  if (visual.type === "svg") {
    return (
      <div className="relative flex h-44 items-center justify-center bg-card p-4">
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
    <div className="relative h-44 overflow-hidden bg-muted">
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
      <div className="flex min-h-[50vh] items-center justify-center bg-card p-6 sm:p-10">
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
      className="h-[min(75vh,720px)] w-full border-0 bg-muted"
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

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            size="sm"
            variant={activeCategory === "All" ? "default" : "secondary"}
            className="rounded-full"
            onClick={() => setActiveCategory("All")}
          >
            All
          </Button>
          {visualCategories.map((category) => (
            <Button
              key={category}
              type="button"
              size="sm"
              variant={activeCategory === category ? "default" : "secondary"}
              className="rounded-full"
              onClick={() => setActiveCategory(category)}
            >
              {category}
            </Button>
          ))}
        </div>

        <Input
          type="search"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search visuals…"
          className="sm:max-w-xs"
          aria-label="Search visuals"
        />
      </div>

      <p className="text-sm text-muted-foreground">
        {filtered.length} visual{filtered.length === 1 ? "" : "s"}
      </p>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((visual) => (
          <li key={visual.id}>
            <button
              type="button"
              onClick={() => setSelected(visual)}
              className="group flex h-full w-full flex-col overflow-hidden rounded-2xl bg-card text-left shadow-border transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-border-hover active:scale-[0.96]"
            >
              <VisualPreview visual={visual} />
              <div className="flex flex-1 flex-col gap-2 p-5">
                <Badge className="w-fit">{visual.category}</Badge>
                <h2 className="text-base font-semibold text-foreground group-hover:text-primary">
                  {visual.title}
                </h2>
                <span className="mt-auto text-xs text-muted-foreground">
                  Click to expand
                </span>
              </div>
            </button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No visuals match your search. Try another category or keyword.
          </p>
        </Card>
      ) : null}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[92vh] max-w-5xl overflow-hidden p-0">
          {selected ? (
            <>
              <DialogHeader className="px-6 pt-6">
                <Badge className="w-fit">{selected.category}</Badge>
                <DialogTitle>{selected.title}</DialogTitle>
                <DialogDescription className="sr-only">
                  Expanded visual reference
                </DialogDescription>
              </DialogHeader>
              <div className="overflow-auto">
                <VisualExpanded visual={selected} />
              </div>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
