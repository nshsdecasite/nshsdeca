"use client";

import { useMemo, useState } from "react";
import type { ClusterSlug } from "@/data/vocab-clusters";
import type { TheoryCategory } from "@/data/theories";
import type { Theory } from "@/lib/content/theories";
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

  if (theories.length === 0) {
    return (
      <Card className="p-10 text-center">
        <p className="text-sm text-muted-foreground">
          No theories are available yet. Check back soon.
        </p>
      </Card>
    );
  }

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          size="sm"
          variant={activeCategory === "all" ? "default" : "secondary"}
          className="rounded-full"
          onClick={() => setActiveCategory("all")}
        >
          All types
        </Button>
        {categories.map((category) => (
          <Button
            key={category.value}
            type="button"
            size="sm"
            variant={activeCategory === category.value ? "default" : "secondary"}
            className="rounded-full"
            onClick={() => setActiveCategory(category.value)}
          >
            {category.label}
          </Button>
        ))}
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

      <Input
        type="search"
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search theories…"
        className="sm:max-w-md"
        aria-label="Search theories"
      />

      <p className="text-sm text-muted-foreground">
        {filtered.length} theor{filtered.length === 1 ? "y" : "ies"}
      </p>

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((theory) => (
          <li key={theory.id}>
            <button
              type="button"
              onClick={() => setSelected(theory)}
              className="group flex h-full w-full flex-col rounded-2xl border border-border/60 bg-card p-5 text-left shadow-border transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-border-hover active:scale-[0.96]"
            >
              <div className="mb-3 flex flex-wrap items-center gap-2">
                <Badge>{theory.categoryLabel}</Badge>
                <Badge variant="muted">{theory.clusterLabel}</Badge>
              </div>
              <h2 className="text-base font-semibold text-foreground group-hover:text-primary">
                {theory.theoryName}
              </h2>
              <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted-foreground">
                {theory.explanation}
              </p>
              <span className="mt-4 text-xs text-muted-foreground">
                Click to read more
              </span>
            </button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 ? (
        <Card className="p-10 text-center">
          <p className="text-sm text-muted-foreground">
            No theories match your filters. Try another category, cluster, or
            keyword.
          </p>
        </Card>
      ) : null}

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-h-[92vh] max-w-3xl overflow-y-auto">
          {selected ? (
            <>
              <DialogHeader>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge>{selected.categoryLabel}</Badge>
                  <Badge variant="muted">{selected.clusterLabel}</Badge>
                </div>
                <DialogTitle className="text-xl sm:text-2xl">
                  {selected.theoryName}
                </DialogTitle>
                <DialogDescription className="sr-only">
                  Theory explanation and example scenario
                </DialogDescription>
              </DialogHeader>
              <section>
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Explanation
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground sm:text-base">
                  {selected.explanation}
                </p>
              </section>
              <section className="rounded-2xl bg-muted p-4 sm:p-5">
                <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-primary">
                  Example scenario
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-foreground sm:text-base">
                  {selected.exampleScenario}
                </p>
              </section>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
