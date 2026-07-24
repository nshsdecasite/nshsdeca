import type { Metadata } from "next";
import Link from "next/link";
import {
  getPiFilterOptions,
  listPerformanceIndicators,
} from "@/app/study/actions";
import { SocialPage, SocialPanel } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { PiCard } from "@/components/study/PiCard";
import { PiFilterPills, PiFilters } from "@/components/study/PiFilters";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Performance indicators",
};

type PisPageProps = {
  searchParams: Promise<{
    search?: string;
    ia?: string;
    cluster?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 48;

export default async function PisPage({ searchParams }: PisPageProps) {
  await requireAuth("/study/pis");
  const params = await searchParams;
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;

  const [pis, filterOptions] = await Promise.all([
    listPerformanceIndicators({
      search: params.search?.trim() || undefined,
      iaCode: params.ia?.trim() || undefined,
      clusterSlug: params.cluster?.trim() || undefined,
      limit: PAGE_SIZE,
      offset,
    }),
    getPiFilterOptions(),
  ]);

  const current = {
    search: params.search,
    ia: params.ia,
    cluster: params.cluster,
  };

  return (
    <SocialPage size="wide">
      <PageHeader
        backHref="/study"
        backLabel="Study tools"
        eyebrow="Performance indicators"
        title="PI browser"
        description="Search the master PI bank and see which practice tests and roleplay events use each indicator."
      />

      <div className="space-y-6">
        <PiFilters
          instructionalAreas={filterOptions.instructional_areas}
          clusters={filterOptions.clusters}
          current={current}
        />
        <PiFilterPills current={current} />

        {pis.length === 0 ? (
          <SocialPanel className="p-8 text-center">
            <p className="text-muted-foreground">No performance indicators match those filters.</p>
          </SocialPanel>
        ) : (
          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {pis.map((pi) => (
              <li key={pi.id}>
                <PiCard pi={pi} />
              </li>
            ))}
          </ul>
        )}

        <div className="flex items-center justify-between gap-4">
          {page > 1 ? (
            <Button asChild variant="secondary">
              <Link
                href={`/study/pis?${new URLSearchParams({
                  ...(params.search ? { search: params.search } : {}),
                  ...(params.ia ? { ia: params.ia } : {}),
                  ...(params.cluster ? { cluster: params.cluster } : {}),
                  page: String(page - 1),
                }).toString()}`}
              >
                ← Previous
              </Link>
            </Button>
          ) : (
            <span />
          )}

          {pis.length === PAGE_SIZE ? (
            <Button asChild variant="secondary">
              <Link
                href={`/study/pis?${new URLSearchParams({
                  ...(params.search ? { search: params.search } : {}),
                  ...(params.ia ? { ia: params.ia } : {}),
                  ...(params.cluster ? { cluster: params.cluster } : {}),
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
