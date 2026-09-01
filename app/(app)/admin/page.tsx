import type { Metadata } from "next";
import { getAdminOverview, listChapterMembers } from "@/app/admin/actions";
import { AdminPanel } from "@/components/platform/AdminPanel";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const { user, role } = await requireRole(["officer", "advisor"], "/admin");
  const [overview, members] = await Promise.all([
    getAdminOverview(),
    listChapterMembers(),
  ]);

  return (
    <SocialPage size="wide">
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        eyebrow="Officers"
        title="Admin panel"
        description="Member roles, chapter stats, and CSV export. Announcements and messages live on the inbox page."
      />
      <AdminPanel
        overview={overview}
        members={members}
        currentUserId={user.id}
        currentRole={role === "advisor" ? "advisor" : "officer"}
      />
    </SocialPage>
  );
}
