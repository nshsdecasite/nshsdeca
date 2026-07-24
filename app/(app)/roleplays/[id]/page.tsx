import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getScenario } from "@/app/roleplay/scenario-actions";
import { SocialPage, SocialPanel } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { PerformanceIndicatorsList } from "@/components/study/PerformanceIndicatorsList";
import { Button } from "@/components/ui/button";
import { LEVEL_LABELS } from "@/lib/roleplay/scenario-types";
import { getUserRole, requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Scenario",
};

type ScenarioPageProps = {
  params: Promise<{ id: string }>;
};

export default async function ScenarioPage({ params }: ScenarioPageProps) {
  const { id } = await params;
  const user = await requireAuth(`/roleplays/${id}`);
  const role = await getUserRole(user.id);
  const scenario = await getScenario(id);

  if (!scenario) {
    notFound();
  }

  const title =
    scenario.scenario_title?.trim() ||
    `${scenario.event_code} scenario ${scenario.scenario_number}`;

  return (
    <SocialPage>
      <PageHeader
        backHref="/roleplays"
        backLabel="Scenario library"
        eyebrow={`${scenario.event_code} · ${LEVEL_LABELS[scenario.level]} · ${scenario.year}`}
        title={title}
        description={`${scenario.event_name}${scenario.cluster_name ? ` · ${scenario.cluster_name}` : ""}`}
      />

      <div className="mb-6 flex flex-wrap gap-2">
        {scenario.instructional_area_code ? (
          <span className="rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
            IA: {scenario.instructional_area_code}
            {scenario.instructional_area_name
              ? ` — ${scenario.instructional_area_name}`
              : ""}
          </span>
        ) : null}
        {scenario.career_pathway ? (
          <span className="rounded-full bg-muted px-3 py-1 text-xs font-semibold text-muted-foreground">
            {scenario.career_pathway}
          </span>
        ) : null}
      </div>

      <div className="space-y-6">
        {scenario.pis?.length ? (
          <PerformanceIndicatorsList pis={scenario.pis} />
        ) : null}

        <SocialPanel className="p-6 sm:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
            Participant situation
          </h2>
          <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
            {scenario.situation_description ?? "No situation text available."}
          </p>
        </SocialPanel>

        {scenario.judge_characterization ? (
          <SocialPanel className="p-6 sm:p-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
              Judge characterization
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-muted-foreground">
              {scenario.judge_characterization}
            </p>
          </SocialPanel>
        ) : null}

        {scenario.solution_text ? (
          <SocialPanel className="border-primary/15 bg-primary/10 p-6 sm:p-8">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
              Reference solution
            </h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground">
              {scenario.solution_text}
            </p>
          </SocialPanel>
        ) : null}
      </div>

      <div className="mt-8 flex flex-wrap gap-3">
        {role === "student" ? (
          <Button asChild>
            <Link href={`/roleplays/submit?scenario=${scenario.id}`}>
              Submit this roleplay
            </Link>
          </Button>
        ) : null}
        {scenario.source_url ? (
          <Button asChild variant="secondary">
            <a href={scenario.source_url} target="_blank" rel="noreferrer">
              View source PDF
            </a>
          </Button>
        ) : null}
      </div>
    </SocialPage>
  );
}
