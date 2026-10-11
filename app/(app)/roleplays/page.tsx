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

export default async function RoleplaysPage({ searchParams }: RoleplaysPageProps) {
  await requireAuth("/roleplays");
  const [params, profile] = await Promise.all([searchParams, loadMyProfile()]);
  const search = [params.search?.trim(), params.pi?.trim()]
    .filter(Boolean)
    .join(" ");

  const [scenarios, filterOptions] = await Promise.all([
    listScenarios({
      search: search || undefined,
      limit: 1000,
      offset: 0,
    }),
    getScenarioFilterOptions(),
  ]);

  return (
    <LibraryScreen
      scenarios={scenarios}
      years={filterOptions.years}
      events={filterOptions.events}
      instructionalAreas={filterOptions.instructional_areas ?? []}
      levels={filterOptions.levels ?? ["district", "state", "icdc"]}
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
