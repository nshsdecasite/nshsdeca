import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getSubmission } from "@/app/roleplay/actions";
import { StudentFeedbackView } from "@/components/roleplay/StudentFeedbackView";
import { requireAuth } from "@/lib/auth/roles";
import { getScenario } from "@/lib/roleplay/scenarios";

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
  const scenario = submission ? getScenario(submission.scenario_key) : undefined;

  if (!submission || !scenario) {
    notFound();
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <StudentFeedbackView submission={submission} scenario={scenario} />
    </div>
  );
}
