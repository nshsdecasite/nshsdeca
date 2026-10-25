"use client";

import { Suspense, use, useCallback, useEffect, useLayoutEffect, useRef, useState, useTransition } from "react";
import { listScenarios } from "@/app/roleplay/scenario-actions";
import { DecaButton } from "@/components/deca/button";
import {
  ScenarioFilterBar,
  type ScenarioFilters,
} from "@/components/deca/scenario-filter-bar";
import { LEVEL_LABELS, type ScenarioSummary } from "@/lib/roleplay/scenario-types";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

function buildHref(filters: ScenarioFilters) {
  const params = new URLSearchParams();
  if (filters.search) params.set("search", filters.search);
  if (filters.year) params.set("year", filters.year);
  if (filters.event) params.set("event", filters.event);
  if (filters.level) params.set("level", filters.level);
  if (filters.area) params.set("area", filters.area);
  if (filters.pi) params.set("pi", filters.pi);
  const query = params.toString();
  return query ? `/roleplays?${query}` : "/roleplays";
}

function readFilters(): ScenarioFilters {
  const params = new URLSearchParams(window.location.search);
  const filters: ScenarioFilters = {};
  const search = params.get("search")?.trim();
  const year = params.get("year")?.trim();
  const event = params.get("event")?.trim();
  const level = params.get("level")?.trim();
  const area = params.get("area")?.trim();
  const pi = params.get("pi")?.trim();
  if (search) filters.search = search;
  if (year) filters.year = year;
  if (event) filters.event = event;
  if (level) filters.level = level;
  if (area) filters.area = area;
  if (pi) filters.pi = pi;
  return filters;
}

function searchQuery(filters: ScenarioFilters) {
  const query = [filters.search?.trim(), filters.pi?.trim()].filter(Boolean).join(" ");
  return query || undefined;
}

function filterScenarios(scenarios: ScenarioSummary[], filters: ScenarioFilters) {
  return scenarios.filter((scenario) => {
    if (filters.event && scenario.event_code !== filters.event) return false;
    if (filters.area && scenario.instructional_area_code !== filters.area) return false;
    if (filters.level === "practice") {
      if (scenario.level !== "practice") return false;
    } else if (scenario.level === "practice") {
      return false;
    }
    if (filters.year === "older") return scenario.year < 2023;
    if (filters.year && String(scenario.year) !== filters.year) return false;
    return true;
  });
}

function generatedScenarios(scenarios: ScenarioSummary[], filters: ScenarioFilters) {
  return scenarios.filter((scenario) => {
    if (scenario.level !== "practice") return false;
    if (filters.event && scenario.event_code !== filters.event) return false;
    if (filters.area && scenario.instructional_area_code !== filters.area) return false;
    if (filters.year === "older") return scenario.year < 2023;
    if (filters.year && String(scenario.year) !== filters.year) return false;
    return true;
  });
}

function ScenarioGrid({
  scenarios,
  pending,
}: {
  scenarios: ScenarioSummary[];
  pending: boolean;
}) {
  if (scenarios.length === 0) {
    return (
      <p className="mt-10 text-[15px] leading-[1.6] text-ink-2">
        No scenarios match those filters.
      </p>
    );
  }

  return (
    <div
      aria-busy={pending}
      className={cn(
        "mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3",
        pending && "opacity-60",
      )}
    >
      {scenarios.map((scenario) => {
        const title =
          scenario.scenario_title?.trim() ||
          `${scenario.event_code} scenario ${scenario.scenario_number}`;
        const description =
          scenario.preview?.trim() ||
          `${scenario.event_name}${
            scenario.instructional_area_code
              ? ` · ${scenario.instructional_area_code}`
              : scenario.cluster_name
                ? ` · ${scenario.cluster_name}`
                : ""
          }.`;
        const level = LEVEL_LABELS[scenario.level] ?? scenario.level;
        return (
          <div key={scenario.id} className="deca-card flex flex-col px-7 py-[26px]">
            <div className="flex flex-wrap gap-2">
              <span className="w-fit rounded-full bg-ever-lt px-3 py-1 text-[11px] font-extrabold text-ever-dk">
                {scenario.event_code}
                {scenario.instructional_area_code
                  ? ` · ${scenario.instructional_area_code}`
                  : ""}{" "}
                · {scenario.year} · {String(level).toUpperCase()}
              </span>
              {scenario.review_status === "pending_review" ? (
                <span className="w-fit rounded-full bg-gold-lt px-3 py-1 text-[11px] font-extrabold text-gold">
                  Sent for review
                </span>
              ) : null}
              {scenario.review_status === "approved" ? (
                <span className="w-fit rounded-full bg-ever-lt px-3 py-1 text-[11px] font-extrabold text-ever-dk">
                  Approved
                </span>
              ) : null}
            </div>
            <h3 className="mt-4 font-display text-xl font-extrabold tracking-[-0.02em]">
              {title}
            </h3>
            <p className="mt-2 mb-5 flex-1 text-[13px] leading-[1.55] text-ink-2 line-clamp-4">
              {description}
            </p>
            <DecaButton
              href={`/roleplays/${scenario.id}`}
              variant="tint"
              size="sm"
              className="mt-auto self-start"
            >
              Open
            </DecaButton>
          </div>
        );
      })}
    </div>
  );
}

function ScenarioGridSkeleton() {
  return (
    <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }, (_, index) => (
        <Skeleton key={index} className="h-52 w-full" />
      ))}
    </div>
  );
}

function CatalogReady({
  catalog,
  filters,
  pending,
  onReady,
}: {
  catalog: Promise<ScenarioSummary[]>;
  filters: ScenarioFilters;
  pending: boolean;
  onReady: (rows: ScenarioSummary[]) => void;
}) {
  const scenarios = use(catalog);
  useLayoutEffect(() => {
    onReady(scenarios);
  }, [scenarios, onReady]);
  return <ScenarioGrid scenarios={filterScenarios(scenarios, filters)} pending={pending} />;
}

export function LibraryScreen({
  catalog,
  years = [],
  events,
  instructionalAreas = [],
  current,
}: {
  catalog: Promise<ScenarioSummary[]>;
  years?: number[];
  events: { event_code: string; event_name: string }[];
  instructionalAreas?: { code: string; name: string }[];
  current: ScenarioFilters;
}) {
  const serverKey = JSON.stringify(current);
  const [filters, setFilters] = useState(current);
  const [serverKeySeen, setServerKeySeen] = useState(serverKey);
  const [loaded, setLoaded] = useState<ScenarioSummary[] | null>(null);
  const [override, setOverride] = useState<ScenarioSummary[] | null>(null);
  const [loadError, setLoadError] = useState("");
  const [pending, startTransition] = useTransition();
  const fetchedSearch = useRef(searchQuery(current) ?? "");
  const filtersRef = useRef(filters);
  filtersRef.current = filters;
  const rememberCatalog = useCallback((rows: ScenarioSummary[]) => {
    setLoaded(rows);
  }, []);

  if (serverKey !== serverKeySeen) {
    setServerKeySeen(serverKey);
    setFilters(current);
    setLoaded(null);
    setOverride(null);
    fetchedSearch.current = searchQuery(current) ?? "";
  }

  useEffect(() => {
    function onPopState() {
      const next = readFilters();
      filtersRef.current = next;
      setFilters(next);
      const query = searchQuery(next) ?? "";
      if (query === fetchedSearch.current) return;
      fetchedSearch.current = query;
      startTransition(async () => {
        try {
          const rows = await listScenarios({ search: query || undefined, limit: 1000 });
          if (fetchedSearch.current !== query) return;
          setOverride(rows);
          setLoadError("");
        } catch {
          if (fetchedSearch.current === query) setLoadError("Could not load scenarios.");
        }
      });
    }
    window.addEventListener("popstate", onPopState);
    return () => window.removeEventListener("popstate", onPopState);
  }, []);

  function commit(next: ScenarioFilters) {
    filtersRef.current = next;
    setFilters(next);
    const href = buildHref(next);
    const here = `${window.location.pathname}${window.location.search}`;
    if (here !== href) window.history.pushState(null, "", href);

    const query = searchQuery(next) ?? "";
    if (query === fetchedSearch.current) return;
    fetchedSearch.current = query;
    setLoadError("");
    startTransition(async () => {
      try {
        const rows = await listScenarios({ search: query || undefined, limit: 1000 });
        if (fetchedSearch.current !== query) return;
        setOverride(rows);
      } catch {
        if (fetchedSearch.current === query) setLoadError("Could not load scenarios.");
      }
    });
  }

  function updateFilters(patch: Partial<ScenarioFilters>) {
    const next: ScenarioFilters = { ...filtersRef.current, ...patch };
    (Object.keys(next) as (keyof ScenarioFilters)[]).forEach((key) => {
      if (!next[key]) delete next[key];
    });
    commit(next);
  }

  const source = override ?? loaded;
  const visible = source ? filterScenarios(source, filters) : null;
  const generatedLibrary = filters.level === "practice";
  const areaLabel = filters.area
    ? instructionalAreas.find((area) => area.code === filters.area)?.name ?? filters.area
    : undefined;
  const summaryParts = [
    filters.event,
    areaLabel,
    generatedLibrary ? null : filters.level
      ? LEVEL_LABELS[filters.level as ScenarioSummary["level"]] ?? filters.level
      : null,
    filters.year && filters.year !== "older" ? filters.year : null,
    filters.year === "older" ? "2017–2022" : null,
  ].filter(Boolean);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="text-balance font-display text-[32px] font-black tracking-[-0.04em] sm:text-[40px]">
            {generatedLibrary ? "Generated library" : "Scenario library"}
          </h1>
          <p className="mt-2.5 text-pretty text-sm text-ink-2">
            {summaryParts.length ? `${summaryParts.join(" · ")} — ` : ""}
            {visible ? (
              <strong className="tabular">{visible.length} scenarios</strong>
            ) : (
              <Skeleton className="inline-block h-4 w-24 align-middle" />
            )}
          </p>
        </div>
      </div>

      <ScenarioFilterBar
        years={years}
        events={events}
        instructionalAreas={instructionalAreas}
        generated={source ? generatedScenarios(source, filters) : []}
        value={filters}
        onChange={updateFilters}
      />

      {loadError ? <p className="mt-4 text-sm text-[#b42318]">{loadError}</p> : null}

      {override ? (
        <ScenarioGrid scenarios={filterScenarios(override, filters)} pending={pending} />
      ) : (
        <Suspense fallback={<ScenarioGridSkeleton />}>
          <CatalogReady
            catalog={catalog}
            filters={filters}
            pending={pending}
            onReady={rememberCatalog}
          />
        </Suspense>
      )}
    </div>
  );
}
