import type { Metadata } from "next";
import {
  getScenarioFilterOptions,
  listScenarios,
} from "@/app/roleplay/scenario-actions";
import { LibraryScreen } from "@/components/deca/library-screen";
import { requireAuth } from "@/lib/auth/roles";
import { loadMyProfile } from "@/lib/data/request-cache";

export const metadata: Metadata = {
  title: "Roleplay scenarios",
};

type RoleplaysPageProps = {
  searchParams: Promise<{
    search?: string;
    year?: string;
    event?: string;
    level?: string;
    area?: string;
    pi?: string;
    page?: string;
  }>;
};

function loadCatalog(search: string) {
  return listScenarios({
    search: search || undefined,
    limit: 1000,
    offset: 0,
  });
}

export default async function RoleplaysPage({ searchParams }: RoleplaysPageProps) {
  await requireAuth("/roleplays");
  const [params, profile] = await Promise.all([searchParams, loadMyProfile()]);
  const search = [params.search?.trim(), params.pi?.trim()]
    .filter(Boolean)
    .join(" ");

  const catalog = loadCatalog(search);
  const filterOptions = await getScenarioFilterOptions();

  return (
    <LibraryScreen
      catalog={catalog}
      years={filterOptions.years}
      events={filterOptions.events}
      instructionalAreas={filterOptions.instructional_areas ?? []}
      current={{
        search: params.search,
        year: params.year,
        event: params.event?.trim() || profile?.event_code || undefined,
        level: params.level,
        area: params.area,
        pi: params.pi,
      }}
    />
  );
}
