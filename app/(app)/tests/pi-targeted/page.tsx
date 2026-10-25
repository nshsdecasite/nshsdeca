import type { Metadata } from "next";
import { getDashboardStats } from "@/app/platform/actions";
import { PiTargetedLauncher } from "@/components/test/PiTargetedLauncher";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth/roles";
import { isAssignedExamLocked } from "@/lib/test/assigned-exam-lock";

export const metadata: Metadata = {
  title: "PI-targeted test",
};

export default async function PiTargetedTestPage() {
  await requireAuth("/tests/pi-targeted");
  if (await isAssignedExamLocked()) {
    return (
      <SocialPage>
        <PageHeader
          backHref="/study/exams"
          backLabel="Practice tests"
          eyebrow="PI-targeted"
          title="Practice your weakest PIs"
        />
        <p className="max-w-2xl text-sm leading-6 text-ink-2">
          PI-targeted tests stay locked until you submit your assigned exam, or until 4:00 p.m. Central on Monday.
        </p>
      </SocialPage>
    );
  }
  const stats = await getDashboardStats();

  return (
    <SocialPage>
      <PageHeader
        backHref="/study/exams"
        backLabel="Practice tests"
        eyebrow="PI-targeted"
        title="Practice your weakest PIs"
      />
      <PiTargetedLauncher weakPiCount={stats.weak_pis?.length ?? 0} />
    </SocialPage>
  );
}
