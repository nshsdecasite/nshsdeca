import type { Metadata } from "next";
import {
  getScenario,
  listScenarios,
} from "@/app/roleplay/scenario-actions";
import { SubmitRoleplayForm } from "@/components/roleplay/SubmitRoleplayForm";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Submit roleplay",
};

type SubmitRoleplayPageProps = {
  searchParams: Promise<{ scenario?: string }>;
};

export default async function SubmitRoleplayPage({
  searchParams,
}: SubmitRoleplayPageProps) {
  await requireRole(["student"], "/roleplays/submit");
  const params = await searchParams;
  const selectedScenario = params.scenario
    ? await getScenario(params.scenario)
    : null;

  const scenarios = selectedScenario
    ? [
        {
          id: selectedScenario.id,
          event_code: selectedScenario.event_code,
          event_name: selectedScenario.event_name,
          cluster_name: selectedScenario.cluster_name,
          year: selectedScenario.year,
          level: selectedScenario.level,
          scenario_number: selectedScenario.scenario_number,
          scenario_title: selectedScenario.scenario_title,
          instructional_area_code: selectedScenario.instructional_area_code,
          career_pathway: selectedScenario.career_pathway,
          preview: selectedScenario.situation_description?.slice(0, 180) ?? null,
        },
      ]
    : await listScenarios({ limit: 12 });

  return (
    <SocialPage>
      <PageHeader
        backHref="/roleplays"
        backLabel="Scenario library"
        title="Submit roleplay"
        description="Select a scenario and submit your roleplay video for officer grading."
      />
      <SubmitRoleplayForm
        scenarios={scenarios}
        initialScenarioId={params.scenario ?? ""}
      />
    </SocialPage>
  );
}
