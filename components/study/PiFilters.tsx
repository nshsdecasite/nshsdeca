import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { SelectMenu } from "@/components/ui/select-menu";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type PiFiltersProps = {
  instructionalAreas: { code: string; name: string }[];
  clusters: { slug: string; name: string }[];
  current: {
    search?: string;
    ia?: string;
    cluster?: string;
    event?: string;
    tier?: string;
  };
};

function buildHref(
  current: PiFiltersProps["current"],
  patch: Record<string, string | undefined>,
) {
  const params = new URLSearchParams();
  const merged = { ...current, ...patch };
  if (merged.search) params.set("search", merged.search);
  if (merged.ia) params.set("ia", merged.ia);
  if (merged.cluster) params.set("cluster", merged.cluster);
  if (merged.event) params.set("event", merged.event);
  if (merged.tier) params.set("tier", merged.tier);
  const query = params.toString();
  return query ? `/study/pis?${query}` : "/study/pis?all=1";
}

export function PiFilters({
  instructionalAreas,
  clusters,
  current,
}: PiFiltersProps) {
  return (
    <Card className="p-5">
      <form action="/study/pis" method="get">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <div>
            <Label htmlFor="pi-search">Search</Label>
            <Input
              id="pi-search"
              type="search"
              name="search"
              defaultValue={current.search ?? ""}
              placeholder="PI code or keywords…"
              className="mt-2"
            />
          </div>

          <div>
            <Label htmlFor="pi-ia">Instructional area</Label>
            <SelectMenu
              id="pi-ia"
              name="ia"
              defaultValue={current.ia ?? ""}
              className="mt-2"
              options={[
                { value: "", label: "All areas" },
                ...instructionalAreas.map((area) => ({
                  value: area.code,
                  label: `${area.code} — ${area.name}`,
                })),
              ]}
            />
          </div>

          <div>
            <Label htmlFor="pi-cluster">Cluster</Label>
            <SelectMenu
              id="pi-cluster"
              name="cluster"
              defaultValue={current.cluster ?? ""}
              className="mt-2"
              options={[
                { value: "", label: "All clusters" },
                ...clusters.map((cluster) => ({
                  value: cluster.slug,
                  label: cluster.name,
                })),
              ]}
            />
          </div>

          <div>
            <Label htmlFor="pi-tier">Tier</Label>
            <SelectMenu
              id="pi-tier"
              name="tier"
              defaultValue={current.tier ?? ""}
              className="mt-2"
              searchable={false}
              options={[
                { value: "", label: "All tiers" },
                { value: "1", label: "Tier 1" },
                { value: "2", label: "Tier 2" },
                { value: "3", label: "Tier 3" },
              ]}
            />
          </div>
        </div>

        {current.event ? <input type="hidden" name="event" value={current.event} /> : null}

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit">Apply filters</Button>
          <Button variant="ghost" asChild>
            <Link href="/study/pis?all=1">Clear</Link>
          </Button>
        </div>
      </form>
    </Card>
  );
}

export function PiFilterPills({
  current,
}: {
  current: PiFiltersProps["current"];
}) {
  const pills = [
    current.event ? { label: `Event: ${current.event}`, key: "event" } : null,
    current.search ? { label: `Search: ${current.search}`, key: "search" } : null,
    current.ia ? { label: `IA: ${current.ia}`, key: "ia" } : null,
    current.cluster ? { label: `Cluster: ${current.cluster}`, key: "cluster" } : null,
    current.tier ? { label: `Tier ${current.tier}`, key: "tier" } : null,
  ].filter(Boolean) as { label: string; key: keyof PiFiltersProps["current"] }[];

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
