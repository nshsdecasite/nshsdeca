import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSubmission } from "@/app/roleplay/actions";
import { getScenario } from "@/app/roleplay/scenario-actions";
import { StudentFeedbackView } from "@/components/roleplay/StudentFeedbackView";
import { SocialPage } from "@/components/layout/social-ui";
import { requireAuth } from "@/lib/auth/roles";
import {
  scenarioDetailToLegacy,
  submissionScenarioId,
} from "@/lib/roleplay/scenario-display";

export const metadata: Metadata = {
  title: "Submission feedback",
};

export default async function SubmissionDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requireAuth("/submissions");
  const { id } = await params;
  const submission = await getSubmission(id);
  const scenarioDetail = submission
    ? await getScenario(submissionScenarioId(submission))
    : null;
  const scenario = scenarioDetail ? scenarioDetailToLegacy(scenarioDetail) : undefined;

  if (!submission || !scenario) {
    notFound();
  }

  return (
    <SocialPage size="wide">
      <StudentFeedbackView submission={submission} scenario={scenario} />
    </SocialPage>
  );
}
