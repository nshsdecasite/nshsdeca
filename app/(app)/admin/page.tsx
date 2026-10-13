import type { Metadata } from "next";
import {
  getAdminOverview,
  listChapterActivity,
  listChapterMembers,
  listSolutionPeeks,
} from "@/app/admin/actions";
import { AdminPanel } from "@/components/platform/AdminPanel";
import { requireRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const { user, role } = await requireRole(["officer", "advisor"], "/admin");
  const [overview, members, activity, solutionPeeks] = await Promise.all([
    getAdminOverview(),
    listChapterMembers(),
    listChapterActivity(),
    listSolutionPeeks(),
  ]);

  return (
    <div>
      <AdminPanel
        overview={overview}
        members={members}
        activity={activity}
        solutionPeeks={solutionPeeks}
        currentUserId={user.id}
        currentRole={role === "advisor" ? "advisor" : "officer"}
      />
    </div>
  );
}
