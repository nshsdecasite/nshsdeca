import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSubmission } from "@/app/roleplay/actions";
import { getScenario } from "@/app/roleplay/scenario-actions";
import { OfficerGradingWorkspace } from "@/components/roleplay/OfficerGradingWorkspace";
import { SocialPage } from "@/components/layout/social-ui";
import { displayName, requireRole } from "@/lib/auth/roles";
import {
  scenarioDetailToLegacy,
  submissionScenarioId,
} from "@/lib/roleplay/scenario-display";

export const metadata: Metadata = {
  title: "Grade submission",
};

export default async function OfficerGradingDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { user } = await requireRole(["officer", "advisor"], "/admin/grading");
  const { id } = await params;
  const submission = await getSubmission(id);
  const scenarioDetail = submission
    ? await getScenario(submissionScenarioId(submission))
    : null;
  const scenario = scenarioDetail ? scenarioDetailToLegacy(scenarioDetail) : undefined;

  if (!submission || !scenario) {
    notFound();
  }

  const officerName = displayName(
    user.user_metadata?.first_name as string | undefined,
    user.user_metadata?.last_name as string | undefined,
    user.email,
  );

  return (
    <SocialPage size="wide">
      <OfficerGradingWorkspace
        submission={submission}
        scenario={scenario}
        officerName={officerName}
      />
    </SocialPage>
  );
}
