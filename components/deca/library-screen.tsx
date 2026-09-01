"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { DecaButton } from "@/components/deca/button";
import { Logo } from "@/components/logo";
import { FEATURED_EVENTS, PLACEHOLDER_SCENARIOS } from "@/lib/deca/placeholder";
import { LEVEL_LABELS, type ScenarioSummary } from "@/lib/roleplay/scenario-types";
import { cn } from "@/lib/utils";

type Filters = {
  search?: string;
  year?: string;
  event?: string;
  level?: string;
  pi?: string;
};

function buildHref(current: Filters, patch: Record<string, string | undefined>) {
  const merged = { ...current, ...patch };
  const params = new URLSearchParams();
  if (merged.search) params.set("search", merged.search);
  if (merged.year) params.set("year", merged.year);
  if (merged.event) params.set("event", merged.event);
  if (merged.level) params.set("level", merged.level);
  if (merged.pi) params.set("pi", merged.pi);
  const query = params.toString();
  return query ? `/roleplays?${query}` : "/roleplays";
}

export function LibraryScreen({
  scenarios,
  events,
  current,
  total,
}: {
  scenarios: ScenarioSummary[];
  years?: number[];
  events: { event_code: string; event_name: string }[];
  current: Filters;
  total?: number;
}) {
  const [shown, setShown] = useState(6);
  const cards = useMemo(() => {
    const hasFilters = Boolean(
      current.search || current.year || current.event || current.level || current.pi,
    );
    if (scenarios.length === 0) {
      return hasFilters ? [] : PLACEHOLDER_SCENARIOS;
    }
    return scenarios.map((scenario) => ({
      id: scenario.id,
      meta: `${scenario.event_code} · ${LEVEL_LABELS[scenario.level].toUpperCase()} · ${scenario.year}`,
      title:
        scenario.scenario_title?.trim() ||
        `${scenario.event_code} scenario ${scenario.scenario_number}`,
      description:
        scenario.preview?.trim() ||
        `${scenario.event_name}${scenario.cluster_name ? ` · ${scenario.cluster_name}` : ""}.`,
      pis: scenario.instructional_area_code ?? scenario.event_code,
      href: `/roleplays/${scenario.id}`,
    }));
  }, [scenarios, current.search, current.year, current.event, current.level, current.pi]);

  const visible = cards.slice(0, shown);
  const eventCodes = useMemo(() => {
    const fromDb = events.map((event) => event.event_code);
    const featured = FEATURED_EVENTS.filter(
      (code) => fromDb.length === 0 || fromDb.includes(code),
    );
    const rest = fromDb.filter((code) => !FEATURED_EVENTS.includes(code as (typeof FEATURED_EVENTS)[number]));
    return [...featured, ...rest].slice(0, 10);
  }, [events]);

  const yearChips = [2026, 2025, 2024, 2023, "Older"] as const;

  const summary = useMemo(() => {
    const parts = [`${total ?? cards.length} SCENARIOS`];
    if (current.event) parts.push(current.event);
    if (current.level) parts.push(current.level.toUpperCase());
    if (current.year && current.year !== "older") parts.push(current.year);
    if (current.year === "older") parts.push("OLDER");
    return parts.join(" · ");
  }, [cards.length, current, total]);

  return (
    <>
      <div className="border-b border-edge px-6 py-5">
        <Link href="/dashboard" className="inline-flex text-ink hover:text-ink">
          <Logo className="no-outline h-[22px] w-auto" />
        </Link>
      </div>
      <div className="flex items-end justify-between gap-8 border-b border-edge px-11 pb-8 pt-10">
        <div>
          <h1 className="font-display text-[40px] font-extrabold leading-none tracking-[-0.035em] text-ink">
            Scenario library
          </h1>
          <p className="mt-3.5 text-[15px] text-ink-2">
            Pick a scenario, record your attempt, and submit the link for grading.
          </p>
        </div>
        <DecaButton href="/roleplays/submit">Submit a recording</DecaButton>
      </div>

      <div className="grid grid-cols-[260px_minmax(0,1fr)]">
        <aside className="flex flex-col gap-7 border-r border-edge px-7 py-8">
          <form action="/roleplays" method="get">
            {current.event ? (
              <input type="hidden" name="event" value={current.event} />
            ) : null}
            {current.level ? (
              <input type="hidden" name="level" value={current.level} />
            ) : null}
            {current.year ? (
              <input type="hidden" name="year" value={current.year} />
            ) : null}
            {current.pi ? (
              <input type="hidden" name="pi" value={current.pi} />
            ) : null}
            <label
              htmlFor="scenario-search"
              className="mb-2.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-mute"
            >
              Search
            </label>
            <input
              id="scenario-search"
              type="search"
              name="search"
              defaultValue={current.search ?? ""}
              placeholder="pricing strategy"
              className="w-full rounded-[6px] border border-edge bg-white px-3.5 py-[11px] text-sm text-ink"
            />
            <button type="submit" className="sr-only">
              Apply search
            </button>
          </form>

          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-mute">
              Event
            </p>
            <div className="flex flex-wrap gap-2 font-mono text-xs">
              {eventCodes.map((code) => {
                const selected = current.event === code;
                return (
                  <Link
                    key={code}
                    href={buildHref(current, { event: selected ? undefined : code })}
                    className={cn(
                      "rounded-[6px] px-3 py-1.5 transition-[background-color,color,border-color] duration-150",
                      selected
                        ? "bg-ever text-white hover:bg-ever-dk hover:text-white"
                        : "border border-edge px-[11px] py-1.5 text-ink-2 hover:bg-ever-lt hover:text-ever-dk",
                    )}
                  >
                    {code}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-mute">
              Level
            </p>
            <div className="flex overflow-hidden rounded-[6px] border border-edge text-[13px]">
              {(["district", "state", "icdc"] as const).map((level, index) => {
                const selected = current.level === level;
                return (
                  <Link
                    key={level}
                    href={buildHref(current, { level: selected ? undefined : level })}
                    className={cn(
                      "flex-1 py-[9px] text-center transition-[background-color,color] duration-150",
                      index > 0 && "border-l border-edge",
                      selected
                        ? "bg-ever-lt text-ever-dk"
                        : "text-ink-2 hover:bg-ever-lt hover:text-ever-dk",
                    )}
                  >
                    {LEVEL_LABELS[level]}
                  </Link>
                );
              })}
            </div>
          </div>

          <div>
            <p className="mb-3 font-mono text-[11px] uppercase tracking-[0.08em] text-mute">
              Year
            </p>
            <div className="flex flex-wrap gap-2 font-mono text-xs">
              {yearChips.map((year) => {
                const value = year === "Older" ? "older" : String(year);
                const selected = current.year === value;
                return (
                  <Link
                    key={value}
                    href={buildHref(current, { year: selected ? undefined : value })}
                    className={cn(
                      "rounded-[6px] px-3 py-1.5 transition-[background-color,color,border-color] duration-150",
                      selected
                        ? "bg-ever text-white hover:bg-ever-dk hover:text-white"
                        : "border border-edge px-[11px] py-1.5 text-ink-2 hover:bg-ever-lt hover:text-ever-dk",
                    )}
                  >
                    {year}
                  </Link>
                );
              })}
            </div>
          </div>

          <form action="/roleplays" method="get">
            {current.search ? (
              <input type="hidden" name="search" value={current.search} />
            ) : null}
            {current.event ? (
              <input type="hidden" name="event" value={current.event} />
            ) : null}
            {current.level ? (
              <input type="hidden" name="level" value={current.level} />
            ) : null}
            {current.year ? (
              <input type="hidden" name="year" value={current.year} />
            ) : null}
            <label
              htmlFor="scenario-pi"
              className="mb-2.5 block font-mono text-[11px] uppercase tracking-[0.08em] text-mute"
            >
              Performance indicator
            </label>
            <input
              id="scenario-pi"
              type="text"
              name="pi"
              defaultValue={current.pi ?? ""}
              placeholder="MK:019"
              className="w-full rounded-[6px] border border-edge bg-white px-3.5 py-[11px] font-mono text-sm text-ink"
            />
            <button type="submit" className="sr-only">
              Apply indicator
            </button>
          </form>

          <Link
            href="/roleplays"
            className="border-t border-hair pt-2 text-sm text-ink-2 hover:text-ink"
          >
            Clear all filters
          </Link>
        </aside>

        <div>
          <div className="flex items-center justify-between border-b border-edge bg-ground px-8 py-5">
            <p className="m-0 font-mono text-[13px] tabular text-ink-2">{summary}</p>
            <p className="m-0 font-mono text-[13px] text-mute">NEWEST FIRST</p>
          </div>

          {cards.length === 0 ? (
            <p className="px-8 py-16 text-[15px] leading-[1.6] text-ink-2">
              No scenarios match those filters.
            </p>
          ) : (
            <div className="grid grid-cols-2">
              {visible.map((card, index) => {
                const rightCol = index % 2 === 1;
                const lastRow =
                  index >=
                  visible.length - (visible.length % 2 === 0 ? 2 : 1);
                return (
                  <Link
                    key={card.id}
                    href={card.href}
                    className={cn(
                      "flex flex-col gap-3.5 p-8 text-ink transition-colors duration-150 hover:bg-ever-lt hover:text-ink",
                      !rightCol && "border-r border-hair",
                      !lastRow && "border-b border-hair",
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs text-mute">{card.meta}</span>
                      <span className="font-mono text-xs text-gold">10 MIN PREP</span>
                    </div>
                    <h3 className="m-0 font-display text-[23px] font-semibold leading-[1.2] tracking-[-0.02em] text-ink">
                      {card.title}
                    </h3>
                    <p className="m-0 text-[15px] leading-[1.6] text-ink-2">
                      {card.description}
                    </p>
                    <p className="mt-auto pt-2 font-mono text-xs text-ever">{card.pis}</p>
                  </Link>
                );
              })}
            </div>
          )}

          <div className="flex items-center justify-between border-t border-edge px-8 py-6">
            <p className="m-0 font-mono text-xs tabular text-mute">
              SHOWING {visible.length} OF {cards.length}
            </p>
            {shown < cards.length ? (
              <DecaButton
                variant="outline"
                onClick={() => setShown((count) => count + 6)}
              >
                Load more
              </DecaButton>
            ) : null}
          </div>
        </div>
      </div>
    </>
  );
}
