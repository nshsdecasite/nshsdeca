import type { Metadata } from "next";
import { getAdminOverview } from "@/app/admin/actions";
import { AdminPanel } from "@/components/platform/AdminPanel";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  await requireRole(["officer", "advisor"], "/admin");
  const overview = await getAdminOverview();

  return (
    <SocialPage>
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        eyebrow="Officers"
        title="Admin panel"
        description="Post chapter announcements and monitor platform activity."
      />
      <AdminPanel overview={overview} />
    </SocialPage>
  );
}
