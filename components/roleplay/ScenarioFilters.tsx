import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectMenu } from "@/components/ui/select-menu";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type ScenarioFiltersProps = {
  years: number[];
  events: { event_code: string; event_name: string }[];
  instructionalAreas?: { code: string; name: string }[];
  current: {
    search?: string;
    year?: string;
    event?: string;
    level?: string;
    area?: string;
  };
};

function buildHref(
  current: ScenarioFiltersProps["current"],
  patch: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };
  if (merged.search) params.set("search", merged.search);
  if (merged.year) params.set("year", merged.year);
  if (merged.event) params.set("event", merged.event);
  if (merged.level) params.set("level", merged.level);
  if (merged.area) params.set("area", merged.area);
  const query = params.toString();
  return query ? `/roleplays?${query}` : "/roleplays";
}

export function ScenarioFilters({
  years,
  events,
  instructionalAreas = [],
  current,
}: ScenarioFiltersProps) {
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
            <SelectMenu
              id="scenario-year"
              name="year"
              defaultValue={current.year ?? ""}
              className="mt-2"
              options={[
                { value: "", label: "All years" },
                ...years.map((year) => ({ value: String(year), label: String(year) })),
              ]}
            />
          </div>

          <div>
            <Label htmlFor="scenario-event">Event</Label>
            <SelectMenu
              id="scenario-event"
              name="event"
              defaultValue={current.event ?? ""}
              className="mt-2"
              options={[
                { value: "", label: "All events" },
                ...events.map((event) => ({
                  value: event.event_code,
                  label: `${event.event_code} — ${event.event_name}`,
                })),
              ]}
            />
          </div>

          <div>
            <Label htmlFor="scenario-area">Instructional area</Label>
            <SelectMenu
              id="scenario-area"
              name="area"
              defaultValue={current.area ?? ""}
              className="mt-2"
              options={[
                { value: "", label: "All instructional areas" },
                ...instructionalAreas.map((area) => ({
                  value: area.code,
                  label: `${area.code} — ${area.name}`,
                })),
              ]}
            />
          </div>

          <div>
            <Label htmlFor="scenario-level">Level</Label>
            <SelectMenu
              id="scenario-level"
              name="level"
              defaultValue={current.level ?? ""}
              className="mt-2"
              options={[
                { value: "", label: "All levels" },
                { value: "district", label: "District" },
                { value: "state", label: "State" },
                { value: "icdc", label: "ICDC" },
              ]}
            />
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
    current.search ? { label: `Search: ${current.search}`, key: "search" as const } : null,
    current.year ? { label: `Year ${current.year}`, key: "year" as const } : null,
    current.event ? { label: current.event, key: "event" as const } : null,
    current.level ? { label: current.level, key: "level" as const } : null,
    current.area ? { label: current.area, key: "area" as const } : null,
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
