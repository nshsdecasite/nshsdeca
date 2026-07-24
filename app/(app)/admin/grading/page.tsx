import type { Metadata } from "next";
import { listSubmissions } from "@/app/roleplay/actions";
import { OfficerQueueList } from "@/components/roleplay/OfficerQueueList";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Grade submissions",
};

export default async function OfficerGradingPage() {
  await requireRole(["officer", "advisor"], "/admin/grading");
  const submissions = await listSubmissions();

  return (
    <SocialPage>
      <PageHeader
        eyebrow="Officers"
        title="Grading queue"
        description="Review and grade student roleplay submissions."
      />
      <OfficerQueueList submissions={submissions} />
    </SocialPage>
  );
}
