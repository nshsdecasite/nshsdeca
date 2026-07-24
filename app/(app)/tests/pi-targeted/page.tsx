import type { Metadata } from "next";
import { getDashboardStats } from "@/app/platform/actions";
import { PiTargetedLauncher } from "@/components/test/PiTargetedLauncher";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "PI-targeted test",
};

export default async function PiTargetedTestPage() {
  await requireAuth("/tests/pi-targeted");
  const stats = await getDashboardStats();

  return (
    <SocialPage>
      <PageHeader
        backHref="/tests"
        backLabel="Practice tests"
        eyebrow="PI-targeted"
        title="Practice your weakest PIs"
        description="Auto-generates a short quiz from Performance Indicators where your accuracy is below 70%."
      />
      <PiTargetedLauncher weakPiCount={stats.weak_pis?.length ?? 0} />
    </SocialPage>
  );
}
