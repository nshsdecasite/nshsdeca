import type { Metadata } from "next";
import {
  currentUserIsSuperAdmin,
  getAdminOverview,
  listChapterMembers,
} from "@/app/admin/actions";
import { AdminPanel } from "@/components/platform/AdminPanel";
import { requireRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const { user } = await requireRole(["officer", "advisor"], "/admin");
  const [overview, members, currentIsSuperAdmin] = await Promise.all([
    getAdminOverview(),
    listChapterMembers(),
    currentUserIsSuperAdmin(),
  ]);

  return (
    <div>
      <AdminPanel
        overview={overview}
        members={members}
        currentUserId={user.id}
        currentIsSuperAdmin={currentIsSuperAdmin}
      />
    </div>
  );
}
