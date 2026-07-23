import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSubmission } from "@/app/roleplay/actions";
import { OfficerGradingWorkspace } from "@/components/roleplay/OfficerGradingWorkspace";
import { displayName, requireRole } from "@/lib/auth/roles";
import { getScenario } from "@/lib/roleplay/scenarios";

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
  const scenario = submission ? getScenario(submission.scenario_key) : undefined;

  if (!submission || !scenario) {
    notFound();
  }

  const officerName = displayName(
    user.user_metadata?.first_name as string | undefined,
    user.user_metadata?.last_name as string | undefined,
    user.email,
  );

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <OfficerGradingWorkspace
        submission={submission}
        scenario={scenario}
        officerName={officerName}
      />
    </div>
  );
}
