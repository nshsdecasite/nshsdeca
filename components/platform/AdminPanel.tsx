"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import Link from "next/link";
import { setMemberRole } from "@/app/admin/actions";
import type { AdminOverview, ChapterMember } from "@/lib/platform/types";
import { displayName } from "@/lib/auth/display-name";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type AdminPanelProps = {
  overview: AdminOverview;
  members: ChapterMember[];
  currentUserId: string;
  currentRole: "officer" | "advisor";
};

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row
        .map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`)
        .join(","),
    )
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}

export function AdminPanel({
  overview,
  members,
  currentUserId,
  currentRole,
}: AdminPanelProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const canAssignAdvisor = currentRole === "advisor";

  const exportMembers = () => {
    downloadCsv("chapter-members.csv", [
      ["First name", "Last name", "Email", "Grade", "Role", "Points"],
      ...members.map((member) => [
        member.first_name ?? "",
        member.last_name ?? "",
        member.email ?? "",
        member.grade_level?.toString() ?? "",
        member.role,
        String(member.total_points),
      ]),
    ]);
  };

  const exportOverview = () => {
    downloadCsv("chapter-overview.csv", [
      ["Metric", "Value"],
      ["Students", String(overview.student_count)],
      ["Pending submissions", String(overview.pending_submissions)],
      ["Tests this week", String(overview.tests_this_week)],
      ["Members", String(members.length)],
    ]);
  };

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        {[
          { label: "Students", value: overview.student_count },
          { label: "Pending submissions", value: overview.pending_submissions },
          { label: "Tests this week", value: overview.tests_this_week },
        ].map((stat) => (
          <Card key={stat.label} className="p-5">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              {stat.label}
            </p>
            <p className="mt-2 text-3xl font-semibold tabular-nums text-foreground">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Data export</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Download chapter stats and the member roster as CSV.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="secondary" onClick={exportOverview}>
              Export stats
            </Button>
            <Button type="button" variant="secondary" onClick={exportMembers}>
              Export members
            </Button>
          </div>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-foreground">Announcements & messages</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Post chapter announcements and message members from one page.
            </p>
          </div>
          <Button asChild>
            <Link href="/messages">Open inbox</Link>
          </Button>
        </div>
      </Card>

      <Card className="overflow-hidden p-0">
        <div className="p-6 pb-3">
          <h2 className="text-lg font-semibold text-foreground">Chapter members</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {canAssignAdvisor
              ? "Change student, officer, and advisor roles."
              : "Officers can promote students. Only advisors can assign the advisor role."}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-muted text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
              <tr>
                <th className="px-5 py-3">Member</th>
                <th className="px-5 py-3">Grade</th>
                <th className="px-5 py-3">Points</th>
                <th className="px-5 py-3">Role</th>
              </tr>
            </thead>
            <tbody>
              {members.map((member) => (
                <tr key={member.id} className="border-t border-border/60">
                  <td className="px-5 py-3">
                    <p className="font-medium text-foreground">
                      {displayName(member.first_name, member.last_name, member.email)}
                      {member.id === currentUserId ? (
                        <span className="ml-2 text-xs font-semibold text-primary">You</span>
                      ) : null}
                    </p>
                    <p className="text-xs text-muted-foreground">{member.email}</p>
                  </td>
                  <td className="px-5 py-3 tabular-nums text-muted-foreground">
                    {member.grade_level ?? "—"}
                  </td>
                  <td className="px-5 py-3 tabular-nums text-foreground">
                    {member.total_points}
                  </td>
                  <td className="px-5 py-3">
                    <select
                      defaultValue={member.role}
                      disabled={isPending || member.id === currentUserId}
                      onChange={(event) => {
                        const role = event.target.value as ChapterMember["role"];
                        startTransition(async () => {
                          try {
                            await setMemberRole(member.id, role);
                            router.refresh();
                          } catch (roleError) {
                            setError(
                              roleError instanceof Error
                                ? roleError.message
                                : "Could not update role",
                            );
                            event.target.value = member.role;
                          }
                        });
                      }}
                      className="rounded-lg border border-input bg-card px-2 py-1.5 text-sm"
                    >
                      <option value="student">Student</option>
                      <option value="officer">Officer</option>
                      {canAssignAdvisor || member.role === "advisor" ? (
                        <option value="advisor">Advisor</option>
                      ) : null}
                    </select>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
