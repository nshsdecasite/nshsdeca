"use client";

import { Search } from "lucide-react";
import type { FormEvent } from "react";
import { SelectMenu } from "@/components/ui/select-menu";
import { LEVEL_LABELS, type ScenarioSummary } from "@/lib/roleplay/scenario-types";

export type ScenarioFilters = {
  search?: string;
  year?: string;
  event?: string;
  level?: string;
  area?: string;
  pi?: string;
};

function levelName(level: string) {
  return (
    LEVEL_LABELS[level as ScenarioSummary["level"]] ??
    level.charAt(0).toUpperCase() + level.slice(1)
  );
}

export function ScenarioFilterBar({
  years,
  events,
  instructionalAreas,
  levels,
  value,
  onChange,
}: {
  years: number[];
  events: { event_code: string; event_name: string }[];
  instructionalAreas: { code: string; name: string }[];
  levels: string[];
  value: ScenarioFilters;
  onChange: (patch: Partial<ScenarioFilters>) => void;
}) {
  const eventOptions = [...events].sort((a, b) => a.event_code.localeCompare(b.event_code));
  const areaOptions = [...instructionalAreas].sort((a, b) => a.name.localeCompare(b.name));
  const yearOptions = years.map((year) => ({ value: String(year), label: String(year) }));
  if (value.year === "older") yearOptions.push({ value: "older", label: "2017–2022" });
  const areaName = areaOptions.find((area) => area.code === value.area)?.name;
  const hasFilters = Boolean(
    value.search || value.year || value.event || value.level || value.area || value.pi,
  );

  function submitSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const search = String(new FormData(event.currentTarget).get("search") ?? "").trim();
    onChange({ search: search || undefined });
  }

  return (
    <div className="mt-6 flex flex-wrap items-center gap-2">
      <form onSubmit={submitSearch} className="relative min-w-[220px] flex-1">
        <Search
          aria-hidden
          className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-mute"
        />
        <input
          key={value.search ?? ""}
          type="text"
          name="search"
          defaultValue={value.search ?? ""}
          placeholder="Search…"
          aria-label="Search scenarios"
          className="w-full rounded-full bg-white py-[13px] pl-11 pr-28 text-sm text-ink shadow-card placeholder:text-mute"
        />
        <button
          type="submit"
          className="absolute right-1.5 top-1/2 inline-flex h-9 -translate-y-1/2 items-center rounded-full bg-ever-dk px-3.5 text-[12px] font-bold text-white hover:bg-acc-deep"
        >
          Search
        </button>
      </form>

      <SelectMenu
        variant="pill"
        active={Boolean(value.event)}
        aria-label="Event"
        triggerLabel={value.event || "Event"}
        value={value.event ?? ""}
        onValueChange={(event) => onChange({ event: event || undefined })}
        options={[
          { value: "", label: "All events" },
          ...eventOptions.map((event) => ({
            value: event.event_code,
            label: `${event.event_code} — ${event.event_name}`,
          })),
        ]}
      />

      {areaOptions.length > 0 ? (
        <SelectMenu
          variant="pill"
          active={Boolean(value.area)}
          aria-label="Instructional area"
          className="max-w-[260px]"
          triggerLabel={
            value.area ? `${value.area}${areaName ? ` · ${areaName}` : ""}` : "Instructional area"
          }
          value={value.area ?? ""}
          onValueChange={(area) => onChange({ area: area || undefined })}
          options={[
            { value: "", label: "All instructional areas" },
            ...areaOptions.map((area) => ({
              value: area.code,
              label: `${area.code} — ${area.name}`,
            })),
          ]}
        />
      ) : null}

      <SelectMenu
        variant="pill"
        active={Boolean(value.year)}
        aria-label="Year"
        searchable={false}
        triggerLabel={value.year === "older" ? "2017–2022" : value.year || "Year"}
        value={value.year ?? ""}
        onValueChange={(year) => onChange({ year: year || undefined })}
        options={[{ value: "", label: "All years" }, ...yearOptions]}
      />

      <SelectMenu
        variant="pill"
        active={Boolean(value.level)}
        aria-label="Level"
        triggerLabel={value.level ? levelName(value.level) : "Level"}
        value={value.level ?? ""}
        onValueChange={(level) => onChange({ level: level || undefined })}
        options={[
          { value: "", label: "All levels" },
          ...levels.map((level) => ({ value: level, label: levelName(level) })),
        ]}
      />

      {hasFilters ? (
        <button
          type="button"
          onClick={() =>
            onChange({
              search: undefined,
              year: undefined,
              event: undefined,
              level: undefined,
              area: undefined,
              pi: undefined,
            })
          }
          className="rounded-full px-3.5 py-2.5 text-[13px] font-bold text-ever-dk"
        >
          Clear
        </button>
      ) : null}
    </div>
  );
}
