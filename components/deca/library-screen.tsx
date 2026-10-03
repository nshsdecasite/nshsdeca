import Link from "next/link";
import { DecaButton } from "@/components/deca/button";
import { FEATURED_EVENTS } from "@/lib/deca/placeholder";
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
  const cards = scenarios.map((scenario) => ({
    id: scenario.id,
    meta: `${scenario.event_code} · ${scenario.year} · ${LEVEL_LABELS[scenario.level].toUpperCase()}`,
    title:
      scenario.scenario_title?.trim() ||
      `${scenario.event_code} scenario ${scenario.scenario_number}`,
    description:
      scenario.preview?.trim() ||
      `${scenario.event_name}${scenario.cluster_name ? ` · ${scenario.cluster_name}` : ""}.`,
    href: `/roleplays/${scenario.id}`,
  }));

  const fromDb = events.map((event) => event.event_code);
  const featured = FEATURED_EVENTS.filter(
    (code) => fromDb.length === 0 || fromDb.includes(code),
  );
  const rest = fromDb.filter(
    (code) => !FEATURED_EVENTS.includes(code as (typeof FEATURED_EVENTS)[number]),
  );
  const eventCodes = [...featured, ...rest];

  const yearChips = [2026, 2025, 2024, 2023, "older"] as const;
  const levels = [
    { value: "district", label: "District" },
    { value: "state", label: "State" },
    { value: "icdc", label: "ICDC" },
  ] as const;

  const summaryParts = [
    current.event,
    current.level ? LEVEL_LABELS[current.level as keyof typeof LEVEL_LABELS] : null,
    current.year && current.year !== "older" ? current.year : null,
    current.year === "older" ? "2017–2022" : null,
  ].filter(Boolean);

  return (
    <div className="px-9 py-9">
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <h1 className="font-display text-[40px] font-black tracking-[-0.04em]">
            Scenario library
          </h1>
          <p className="mt-2.5 text-sm text-ink-2">
            {summaryParts.length ? `${summaryParts.join(" · ")} — ` : ""}
            <strong>{total ?? cards.length} scenarios</strong>
          </p>
        </div>
        <form action="/roleplays" method="get" className="w-full max-w-[300px]">
          {current.event ? <input type="hidden" name="event" value={current.event} /> : null}
          {current.level ? <input type="hidden" name="level" value={current.level} /> : null}
          {current.year ? <input type="hidden" name="year" value={current.year} /> : null}
          {current.pi ? <input type="hidden" name="pi" value={current.pi} /> : null}
          <input
            type="search"
            name="search"
            defaultValue={current.search ?? ""}
            placeholder="Search scenarios…"
            className="w-full rounded-full bg-white px-[22px] py-[13px] text-sm text-ink shadow-card placeholder:text-mute"
          />
        </form>
      </div>

      <div className="mt-[22px] flex flex-wrap items-center gap-2">
        {current.event ? (
          <Link
            href={buildHref(current, { event: undefined })}
            className="rounded-full bg-ever-dk px-4 py-2 text-[13px] font-bold text-white hover:text-white"
          >
            {current.event} ✕
          </Link>
        ) : null}
        {current.level ? (
          <Link
            href={buildHref(current, { level: undefined })}
            className="rounded-full bg-ever-dk px-4 py-2 text-[13px] font-bold text-white hover:text-white"
          >
            {LEVEL_LABELS[current.level as keyof typeof LEVEL_LABELS]} ✕
          </Link>
        ) : null}
        {current.year ? (
          <Link
            href={buildHref(current, { year: undefined })}
            className="rounded-full bg-ever-dk px-4 py-2 text-[13px] font-bold text-white hover:text-white"
          >
            {current.year === "older" ? "2017–2022" : current.year} ✕
          </Link>
        ) : null}
        {current.search ? (
          <Link
            href={buildHref(current, { search: undefined })}
            className="rounded-full bg-ever-dk px-4 py-2 text-[13px] font-bold text-white hover:text-white"
          >
            Search ✕
          </Link>
        ) : null}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {eventCodes.slice(0, 10).map((code) => (
          <Link
            key={code}
            href={buildHref(current, { event: current.event === code ? undefined : code })}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-bold",
              current.event === code
                ? "bg-ever-dk text-white"
                : "bg-white text-[#4b463c] shadow-card hover:text-ever-dk",
            )}
          >
            {code}
          </Link>
        ))}
      </div>

      <div className="mt-2 flex flex-wrap gap-2">
        {levels.map((level) => (
          <Link
            key={level.value}
            href={buildHref(current, {
              level: current.level === level.value ? undefined : level.value,
            })}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-bold",
              current.level === level.value
                ? "bg-ever-dk text-white"
                : "bg-white text-[#4b463c] shadow-card hover:text-ever-dk",
            )}
          >
            {level.label}
          </Link>
        ))}
        {yearChips.map((year) => (
          <Link
            key={year}
            href={buildHref(current, {
              year: current.year === String(year) ? undefined : String(year),
            })}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-xs font-bold",
              current.year === String(year)
                ? "bg-ever-dk text-white"
                : "bg-white text-[#4b463c] shadow-card hover:text-ever-dk",
            )}
          >
            {year === "older" ? "2017–22" : year}
          </Link>
        ))}
        {(current.event || current.level || current.year || current.search) && (
          <Link href="/roleplays" className="rounded-full px-3.5 py-1.5 text-xs font-bold text-ever-dk">
            Clear all
          </Link>
        )}
      </div>

      {cards.length === 0 ? (
        <p className="mt-10 text-[15px] leading-[1.6] text-ink-2">
          No scenarios match those filters.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {cards.map((card) => (
            <div key={card.id} className="deca-card flex flex-col px-7 py-[26px]">
              <span className="w-fit rounded-full bg-ever-lt px-3 py-1 text-[11px] font-extrabold text-ever-dk">
                {card.meta}
              </span>
              <h3 className="mt-4 font-display text-xl font-extrabold tracking-[-0.02em]">
                {card.title}
              </h3>
              <p className="mt-2 mb-5 flex-1 text-[13px] leading-[1.55] text-ink-2 line-clamp-4">
                {card.description}
              </p>
              <DecaButton href={card.href} variant="tint" size="sm" className="mt-auto self-start">
                Open
              </DecaButton>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
