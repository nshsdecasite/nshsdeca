import type { Metadata } from "next";
import {
  getAdminOverview,
  listChapterActivity,
  listChapterMembers,
  listChapterTestTabLeaves,
  listSolutionPeeks,
} from "@/app/admin/actions";
import { AdminPanel } from "@/components/platform/AdminPanel";
import { requireRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Admin",
};

export default async function AdminPage() {
  const { user, role } = await requireRole(["officer", "advisor"], "/admin");
  const [overview, members, activity, recentTests, solutionPeeks] = await Promise.all([
    getAdminOverview(),
    listChapterMembers(),
    listChapterActivity(),
    listChapterTestTabLeaves(),
    listSolutionPeeks(),
  ]);

  return (
    <div>
      <AdminPanel
        overview={overview}
        members={members}
        activity={activity}
        recentTests={recentTests}
        solutionPeeks={solutionPeeks}
        currentUserId={user.id}
        currentRole={role === "advisor" ? "advisor" : "officer"}
      />
    </div>
  );
}
