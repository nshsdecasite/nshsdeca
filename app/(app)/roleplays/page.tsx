import type { Metadata } from "next";
import Link from "next/link";
import {
  getScenarioFilterOptions,
  listScenarios,
} from "@/app/roleplay/scenario-actions";
import { SocialPage, SocialPanel } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import {
  ScenarioFilterPills,
  ScenarioFilters,
} from "@/components/roleplay/ScenarioFilters";
import { ScenarioCard } from "@/components/roleplay/ScenarioCard";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Roleplay scenarios",
};

type RoleplaysPageProps = {
  searchParams: Promise<{
    search?: string;
    year?: string;
    event?: string;
    level?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 24;

export default async function RoleplaysPage({ searchParams }: RoleplaysPageProps) {
  await requireAuth("/roleplays");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [scenarios, filterOptions] = await Promise.all([
    listScenarios({
      search: params.search?.trim() || undefined,
      year: params.year ? Number(params.year) : undefined,
      eventCode: params.event?.trim() || undefined,
      level: params.level?.trim() || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    getScenarioFilterOptions(),
  ]);

  const current = {
    search: params.search,
    year: params.year,
    event: params.event,
    level: params.level,
  };

  return (
    <SocialPage size="wide">
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        eyebrow="Roleplays"
        title="Scenario library"
        description="Browse district, state, and ICDC roleplay scenarios by event, year, and competition level."
      />

      <div className="space-y-6">
        <ScenarioFilters
          years={filterOptions.years}
          events={filterOptions.events}
          current={current}
        />
        <ScenarioFilterPills current={current} />

        {scenarios.length === 0 ? (
          <SocialPanel className="p-8 text-center">
            <p className="text-muted-foreground">No scenarios match those filters.</p>
          </SocialPanel>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {scenarios.map((scenario) => (
              <li key={scenario.id}>
                <ScenarioCard scenario={scenario} />
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <Button asChild variant="secondary">
              <Link
                href={`/roleplays?${new URLSearchParams({
                  ...(params.search ? { search: params.search } : {}),
                  ...(params.year ? { year: params.year } : {}),
                  ...(params.event ? { event: params.event } : {}),
                  ...(params.level ? { level: params.level } : {}),
                  page: String(page - 1),
                }).toString()}`}
              >
                ← Previous
              </Link>
            </Button>
          ) : (
            <span />
          )}

          {scenarios.length === PAGE_SIZE ? (
            <Button asChild variant="secondary">
              <Link
                href={`/roleplays?${new URLSearchParams({
                  ...(params.search ? { search: params.search } : {}),
                  ...(params.year ? { year: params.year } : {}),
                  ...(params.event ? { event: params.event } : {}),
                  ...(params.level ? { level: params.level } : {}),
                  page: String(page + 1),
                }).toString()}`}
              >
                Next →
              </Link>
            </Button>
          ) : null}
        </div>
      </div>
    </SocialPage>
  );
}
