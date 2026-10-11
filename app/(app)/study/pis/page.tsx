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
import { loadMyProfile } from "@/lib/data/request-cache";

export const metadata: Metadata = {
  title: "Performance indicators",
};

type PisPageProps = {
  searchParams: Promise<{
    search?: string;
    ia?: string;
    cluster?: string;
    event?: string;
    all?: string;
    page?: string;
  }>;
};

const PAGE_SIZE = 48;

function queryString(params: {
  search?: string;
  ia?: string;
  cluster?: string;
  event?: string;
  page?: number;
}) {
  return new URLSearchParams({
    ...(params.search ? { search: params.search } : {}),
    ...(params.ia ? { ia: params.ia } : {}),
    ...(params.cluster ? { cluster: params.cluster } : {}),
    ...(params.event ? { event: params.event } : {}),
    ...(params.page && params.page > 1 ? { page: String(params.page) } : {}),
  }).toString();
}

export default async function PisPage({ searchParams }: PisPageProps) {
  await requireAuth("/study/pis");
  const [params, profile] = await Promise.all([searchParams, loadMyProfile()]);
  const page = Math.max(1, Number(params.page ?? "1") || 1);
  const offset = (page - 1) * PAGE_SIZE;
  const showAll = params.all === "1";
  const hasExplicit =
    showAll ||
    params.event !== undefined ||
    params.cluster !== undefined ||
    Boolean(params.ia?.trim()) ||
    Boolean(params.search?.trim());

  let eventCode = params.event?.trim() || undefined;
  let clusterSlug = params.cluster?.trim() || undefined;
  if (!hasExplicit && profile?.event_code) {
    if ((profile.event_pi_count ?? 0) > 0) {
      eventCode = profile.event_code;
    } else if (profile.cluster_slug) {
      clusterSlug = profile.cluster_slug;
    }
  }

  const [pis, filterOptions] = await Promise.all([
    listPerformanceIndicators({
      search: params.search?.trim() || undefined,
      iaCode: params.ia?.trim() || undefined,
      clusterSlug,
      eventCode,
      limit: PAGE_SIZE,
      offset,
    }),
    getPiFilterOptions(),
  ]);

  const current = {
    search: params.search,
    ia: params.ia,
    cluster: clusterSlug,
    event: eventCode,
  };
  const pageQuery = {
    search: params.search,
    ia: params.ia,
    cluster: clusterSlug,
    event: eventCode,
  };

  return (
    <SocialPage size="wide">
      <PageHeader
        backHref="/study"
        backLabel="Study tools"
        eyebrow="Performance indicators"
        title="PI browser"
        description={
          eventCode
            ? `Showing the performance indicators for ${eventCode}.`
            : clusterSlug
              ? `Showing ${profile?.cluster_name ?? "cluster"} performance indicators.`
              : "Search the master PI bank and see which practice tests and roleplay events use each indicator."
        }
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
                href={`/study/pis?${queryString({ ...pageQuery, page: page - 1 })}`}
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
                href={`/study/pis?${queryString({ ...pageQuery, page: page + 1 })}`}
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
