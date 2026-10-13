"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { listScenarios } from "@/app/roleplay/scenario-actions";
import { DecaButton } from "@/components/deca/button";
import {
  ScenarioFilterBar,
  type ScenarioFilters,
} from "@/components/deca/scenario-filter-bar";
import { LEVEL_LABELS, type ScenarioSummary } from "@/lib/roleplay/scenario-types";
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

export function LibraryScreen({
  scenarios: initialScenarios,
  years = [],
  events,
  instructionalAreas = [],
  current,
}: {
  scenarios: ScenarioSummary[];
  years?: number[];
  events: { event_code: string; event_name: string }[];
  instructionalAreas?: { code: string; name: string }[];
  current: ScenarioFilters;
}) {
  const serverKey = JSON.stringify(current);
  const [filters, setFilters] = useState(current);
  const [serverKeySeen, setServerKeySeen] = useState(serverKey);
  const [scenarios, setScenarios] = useState(initialScenarios);
  const [loadError, setLoadError] = useState("");
  const [pending, startTransition] = useTransition();
  const fetchedSearch = useRef(searchQuery(current) ?? "");
  const filtersRef = useRef(filters);
  filtersRef.current = filters;

  if (serverKey !== serverKeySeen) {
    setServerKeySeen(serverKey);
    setFilters(current);
    setScenarios(initialScenarios);
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
          setScenarios(rows);
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
        setScenarios(rows);
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

  const visible = filterScenarios(scenarios, filters);
  const areaLabel = filters.area
    ? instructionalAreas.find((area) => area.code === filters.area)?.name ?? filters.area
    : undefined;
  const summaryParts = [
    filters.event,
    areaLabel,
    filters.level ? LEVEL_LABELS[filters.level as ScenarioSummary["level"]] ?? filters.level : null,
    filters.year && filters.year !== "older" ? filters.year : null,
    filters.year === "older" ? "2017–2022" : null,
  ].filter(Boolean);

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-[40px] font-black tracking-[-0.04em]">
            Scenario library
          </h1>
          <p className="mt-2.5 text-sm text-ink-2">
            {summaryParts.length ? `${summaryParts.join(" · ")} — ` : ""}
            <strong className="tabular">{visible.length} scenarios</strong>
          </p>
        </div>
        <DecaButton href="/generate" size="sm">
          Generate
        </DecaButton>
      </div>

      <ScenarioFilterBar
        years={years}
        events={events}
        instructionalAreas={instructionalAreas}
        generated={scenarios.filter((scenario) => {
          if (scenario.level !== "practice") return false;
          if (filters.event && scenario.event_code !== filters.event) return false;
          if (filters.area && scenario.instructional_area_code !== filters.area) return false;
          if (filters.year === "older") return scenario.year < 2023;
          if (filters.year && String(scenario.year) !== filters.year) return false;
          return true;
        })}
        value={filters}
        onChange={updateFilters}
      />

      {loadError ? <p className="mt-4 text-sm text-[#b42318]">{loadError}</p> : null}

      {visible.length === 0 ? (
        <p className="mt-10 text-[15px] leading-[1.6] text-ink-2">
          No scenarios match those filters.
        </p>
      ) : (
        <div
          aria-busy={pending}
          className={cn(
            "mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3",
            pending && "opacity-60",
          )}
        >
          {visible.map((scenario) => {
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
                <span className="w-fit rounded-full bg-ever-lt px-3 py-1 text-[11px] font-extrabold text-ever-dk">
                  {scenario.event_code}
                  {scenario.instructional_area_code
                    ? ` · ${scenario.instructional_area_code}`
                    : ""}{" "}
                  · {scenario.year} · {String(level).toUpperCase()}
                </span>
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
      )}
    </div>
  );
}
