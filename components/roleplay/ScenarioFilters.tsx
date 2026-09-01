import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ScenarioFiltersProps = {
  years: number[];
  events: { event_code: string; event_name: string }[];
  clusters?: { slug: string; name: string }[];
  current: {
    search?: string;
    year?: string;
    event?: string;
    level?: string;
    cluster?: string;
  };
};

function buildHref(current: ScenarioFiltersProps["current"], patch: Record<string, string | undefined>) {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };
  if (merged.search) params.set("search", merged.search);
  if (merged.year) params.set("year", merged.year);
  if (merged.event) params.set("event", merged.event);
  if (merged.level) params.set("level", merged.level);
  if (merged.cluster) params.set("cluster", merged.cluster);
  const query = params.toString();
  return query ? `/roleplays?${query}` : "/roleplays";
}

export function ScenarioFilters({ years, events, clusters = [], current }: ScenarioFiltersProps) {
  return (
    <Card className="p-5">
      <form action="/roleplays" method="get">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          <div>
            <Label htmlFor="scenario-search">Search</Label>
            <Input
              id="scenario-search"
              type="search"
              name="search"
              defaultValue={current.search ?? ""}
              placeholder="Event, PI code, title, keywords…"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="scenario-year">Year</Label>
            <select
              id="scenario-year"
              name="year"
              defaultValue={current.year ?? ""}
              className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All years</option>
              {years.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="scenario-event">Event</Label>
            <select
              id="scenario-event"
              name="event"
              defaultValue={current.event ?? ""}
              className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All events</option>
              {events.map((event) => (
                <option key={event.event_code} value={event.event_code}>
                  {event.event_code} — {event.event_name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="scenario-cluster">Cluster</Label>
            <select
              id="scenario-cluster"
              name="cluster"
              defaultValue={current.cluster ?? ""}
              className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All clusters</option>
              {clusters.map((cluster) => (
                <option key={cluster.slug} value={cluster.slug}>
                  {cluster.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="scenario-level">Level</Label>
            <select
              id="scenario-level"
              name="level"
              defaultValue={current.level ?? ""}
              className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All levels</option>
              <option value="district">District</option>
              <option value="state">State</option>
              <option value="icdc">ICDC</option>
            </select>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit">Apply filters</Button>
          <Button variant="ghost" asChild>
            <Link href="/roleplays">Clear</Link>
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function ScenarioFilterPills({ current }: { current: ScenarioFiltersProps["current"] }) {
  const pills = [
    current.search ? { label: `Search: ${current.search}`, key: "search" } : null,
    current.year ? { label: `Year ${current.year}`, key: "year" } : null,
    current.event ? { label: current.event, key: "event" } : null,
    current.level ? { label: current.level, key: "level" } : null,
    current.cluster ? { label: current.cluster, key: "cluster" } : null,
  ].filter(Boolean) as { label: string; key: keyof ScenarioFiltersProps["current"] }[];

  if (pills.length === 0) return null;

  return (
    <div className="flex flex-wrap gap-2">
      {pills.map((pill) => (
        <Link key={pill.key} href={buildHref(current, { [pill.key]: undefined })}>
          <Badge className="gap-2 normal-case transition-colors hover:bg-primary/15">
            {pill.label}
            <span aria-hidden>×</span>
          </Badge>
        </Link>
      ))}
    </div>
  );
}
