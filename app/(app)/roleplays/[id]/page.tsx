import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { listSubmissions } from "@/app/roleplay/actions";
import { getScenario } from "@/app/roleplay/scenario-actions";
import { ScenarioDetailScreen } from "@/components/deca/scenario-detail-screen";
import { getUserRole, requireAuth } from "@/lib/auth/roles";
import { submissionScenarioId } from "@/lib/roleplay/scenario-display";

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
  const [scenario, submissions] = await Promise.all([
    getScenario(id),
    listSubmissions().catch(() => []),
  ]);

  if (!scenario) {
    notFound();
  }

  const attempts = submissions.filter((item) => submissionScenarioId(item) === id);

  return (
    <ScenarioDetailScreen
      scenario={scenario}
      attempts={attempts}
      canSubmit={role === "student" || role === "officer" || role === "advisor"}
      viewerIsOfficer={role === "officer" || role === "advisor"}
    />
  );
}
