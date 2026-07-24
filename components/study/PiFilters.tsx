import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
  const query = params.toString();
  return query ? `/study/pis?${query}` : "/study/pis";
}

export function PiFilters({
  instructionalAreas,
  clusters,
  current,
}: PiFiltersProps) {
  return (
    <Card className="p-5">
      <form action="/study/pis" method="get">
        <div className="grid gap-4 md:grid-cols-3">
          <div className="md:col-span-1">
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
            <select
              id="pi-ia"
              name="ia"
              defaultValue={current.ia ?? ""}
              className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="">All areas</option>
              {instructionalAreas.map((area) => (
                <option key={area.code} value={area.code}>
                  {area.code} — {area.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <Label htmlFor="pi-cluster">Cluster</Label>
            <select
              id="pi-cluster"
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
        </div>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button type="submit">Apply filters</Button>
          <Button variant="ghost" asChild>
            <Link href="/study/pis">Clear</Link>
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
    current.search ? { label: `Search: ${current.search}`, key: "search" } : null,
    current.ia ? { label: `IA: ${current.ia}`, key: "ia" } : null,
    current.cluster ? { label: `Cluster: ${current.cluster}`, key: "cluster" } : null,
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
