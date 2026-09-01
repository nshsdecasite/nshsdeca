import type { Metadata } from "next";
import {
  getScenarioFilterOptions,
  listScenarios,
} from "@/app/roleplay/scenario-actions";
import { LibraryScreen } from "@/components/deca/library-screen";
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
    pi?: string;
    page?: string;
  }>;
};

export default async function RoleplaysPage({ searchParams }: RoleplaysPageProps) {
  await requireAuth("/roleplays");
  const params = await searchParams;
  const yearParam = params.year;
  const yearNumber =
    yearParam && yearParam !== "older" ? Number(yearParam) : undefined;
  const search = [params.search?.trim(), params.pi?.trim()]
    .filter(Boolean)
    .join(" ");

  const [allScenarios, filterOptions] = await Promise.all([
    listScenarios({
      search: search || undefined,
      year: Number.isFinite(yearNumber) ? yearNumber : undefined,
      eventCode: params.event?.trim() || undefined,
      level: params.level?.trim() || undefined,
      limit: 48,
      offset: 0,
    }),
    getScenarioFilterOptions(),
  ]);

  const scenarios =
    yearParam === "older"
      ? allScenarios.filter((scenario) => scenario.year < 2023)
      : allScenarios;

  return (
    <LibraryScreen
      scenarios={scenarios}
      years={filterOptions.years}
      events={filterOptions.events}
      current={{
        search: params.search,
        year: params.year,
        event: params.event,
        level: params.level,
        pi: params.pi,
      }}
      total={scenarios.length}
    />
  );
}
