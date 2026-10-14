"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition } from "react";
import { SelectMenu } from "@/components/ui/select-menu";
import Link from "next/link";
import { setMemberRole } from "@/app/admin/actions";
import { DecaButton } from "@/components/deca/button";
import { initialsFromName } from "@/lib/deca/format";
import type {
  AdminOverview,
  ChapterActivity,
  ChapterMember,
  SolutionPeek,
} from "@/lib/platform/types";
import { displayName } from "@/lib/auth/display-name";
import { cn } from "@/lib/utils";

type AdminPanelProps = {
  overview: AdminOverview;
  members: ChapterMember[];
  activity: ChapterActivity[];
  solutionPeeks: SolutionPeek[];
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

type Filter = "all" | "officers" | "students";

function MemberRoleSelect({
  role,
  disabled,
  canAssignAdvisor,
  label,
  onRoleChange,
}: {
  role: ChapterMember["role"];
  disabled: boolean;
  canAssignAdvisor: boolean;
  label: string;
  onRoleChange: (role: ChapterMember["role"], revert: () => void) => void;
}) {
  const [value, setValue] = useState(role);
  useEffect(() => {
    setValue(role);
  }, [role]);

  return (
    <SelectMenu
      variant="pill"
      aria-label={`Role for ${label}`}
      disabled={disabled}
      value={value}
      onValueChange={(next) => {
        const roleNext = next as ChapterMember["role"];
        const previous = value;
        setValue(roleNext);
        onRoleChange(roleNext, () => setValue(previous));
      }}
      options={[
        { value: "student", label: "Student" },
        { value: "officer", label: "Officer" },
        ...(canAssignAdvisor || role === "advisor"
          ? [{ value: "advisor", label: "Advisor" }]
          : []),
      ]}
      className={cn(
        "w-auto px-3 py-1 text-[10px] font-extrabold uppercase shadow-none",
        value === "student" ? "bg-ever-lt text-ever-dk" : "bg-ever-dk text-white",
      )}
    />
  );
}

export function AdminPanel({
  overview,
  members,
  activity,
  solutionPeeks,
  currentUserId,
  currentRole,
}: AdminPanelProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [isPending, startTransition] = useTransition();
  const canAssignAdvisor = currentRole === "advisor";

  const filtered = useMemo(() => {
    return members.filter((member) => {
      const name = displayName(member.first_name, member.last_name, member.email).toLowerCase();
      if (query && !name.includes(query.toLowerCase()) && !member.email?.toLowerCase().includes(query.toLowerCase())) {
        return false;
      }
      if (filter === "officers") return member.role !== "student";
      if (filter === "students") return member.role === "student";
      return true;
    });
  }, [filter, members, query]);

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

  return (
    <div>
      <div className="flex flex-wrap items-end justify-between gap-6">
        <div>
          <p className="text-xs font-bold tracking-[0.1em] uppercase text-ever-dk">
            Advisor & officer view
          </p>
          <h1 className="mt-2.5 font-display text-[40px] font-black tracking-[-0.04em]">
            Chapter admin
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder={`Search ${members.length} members…`}
            className="w-[260px] rounded-full bg-white px-5 py-3 text-sm shadow-card placeholder:text-mute"
          />
          <DecaButton variant="outline" onClick={exportMembers}>
            Export CSV
          </DecaButton>
        </div>
      </div>

      <div className="mt-5 flex flex-wrap gap-2">
        {(
          [
            ["all", `All members`],
            ["officers", "Officers"],
            ["students", "Students"],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setFilter(value)}
            className={cn(
              "rounded-full px-4 py-2 text-[13px] font-bold",
              filter === value
                ? "bg-ever-dk text-white"
                : "bg-white text-[#4b463c] shadow-card",
            )}
          >
            {label}
          </button>
        ))}
        <Link
          href="/admin/grading"
          className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#4b463c] shadow-card hover:text-ever-dk"
        >
          Needs grading · {overview.pending_submissions}
        </Link>
        <Link
          href="/admin/generated"
          className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#4b463c] shadow-card hover:text-ever-dk"
        >
          Generated reviews
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
        {[
          [overview.student_count, "Active members"],
          [overview.tests_this_week, "Tests this week"],
          [overview.tests_completed_total ?? 0, "Tests completed"],
          [overview.roleplays_submitted_total ?? 0, "Roleplays submitted"],
          [overview.roleplays_graded_total ?? 0, "Roleplays graded"],
          [overview.tab_blur_events_total ?? 0, "Tab leaves logged"],
        ].map(([value, label]) => (
          <div key={label} className="deca-card px-[26px] py-[22px]">
            <p className="font-display text-[34px] font-black tracking-[-0.035em]">
              {value}
            </p>
            <p className="mt-1 text-[13px] font-semibold text-mute">{label}</p>
          </div>
        ))}
      </div>

      <div className="deca-card mt-4 overflow-x-auto px-[30px] py-[26px]">
        <div className="mb-4 flex items-end justify-between gap-4">
          <div>
            <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em]">
              Member activity
            </h2>
            <p className="mt-1 text-xs text-mute">
              Tests, roleplays, averages, and tab-leave counts during practice tests.
            </p>
          </div>
          <Link
            href="/admin/grading"
            className="rounded-full bg-ever-dk px-4 py-2 text-[13px] font-bold text-white hover:text-white"
          >
            Grade queue · {overview.pending_submissions}
          </Link>
        </div>
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr>
              {[
                "Member",
                "Tests",
                "Avg test %",
                "Roleplays",
                "Avg RP",
                "Tab leaves",
                "Points",
              ].map((heading) => (
                <th
                  key={heading}
                  className="pb-3 text-[11px] font-extrabold tracking-[0.1em] uppercase text-mute"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {activity.map((row) => {
              const name = displayName(row.first_name, row.last_name, row.email);
              return (
                <tr key={row.user_id} className="border-t border-edge">
                  <td className="py-3 pr-3 font-bold">{name}</td>
                  <td className="py-3">{row.tests_completed}</td>
                  <td className="py-3">{row.avg_test_pct ?? "—"}</td>
                  <td className="py-3">
                    {row.roleplays_graded}/{row.roleplays_submitted}
                  </td>
                  <td className="py-3">{row.avg_roleplay_score ?? "—"}</td>
                  <td
                    className={cn(
                      "py-3 font-extrabold",
                      row.tab_blur_count > 0 ? "text-gold" : "text-mute",
                    )}
                  >
                    {row.tab_blur_count}
                  </td>
                  <td className="py-3">{row.total_points}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <div className="deca-card mt-4 overflow-x-auto px-[30px] py-[26px]">
        <h2 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-balance">
          Checked solution before an attempt
        </h2>
        <p className="mt-1 text-pretty text-xs text-mute">
          Members who opened the written solution before recording an attempt.
        </p>
        {solutionPeeks.length === 0 ? (
          <p className="mt-4 text-[13px] text-mute">No solution checks yet.</p>
        ) : (
          <table className="mt-4 w-full border-collapse text-left text-[13px]">
            <thead>
              <tr>
                {["Member", "Roleplay", "Checked", "Attempted after"].map((heading) => (
                  <th
                    key={heading}
                    className="pb-3 text-[11px] font-extrabold tracking-[0.1em] uppercase text-mute"
                  >
                    {heading}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {solutionPeeks.map((peek) => {
                const name = displayName(peek.first_name, peek.last_name, peek.email);
                const title =
                  peek.scenario_title?.trim() || `District Event ${peek.scenario_number}`;
                const checked = new Date(peek.checked_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                });
                return (
                  <tr key={peek.id} className="border-t border-edge">
                    <td className="py-3 pr-3 font-bold">{name}</td>
                    <td className="py-3 pr-3">
                      {peek.event_code} · {title} · {peek.year}
                    </td>
                    <td className="py-3 tabular-nums">{checked}</td>
                    <td className="py-3 font-bold">{peek.attempted_after ? "Yes" : "No"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="deca-card mt-4 overflow-x-auto px-[30px] py-[26px]">
        <table className="w-full border-collapse text-left text-[13px]">
          <thead>
            <tr>
              {["Member", "Grade", "Points", "Role"].map((heading) => (
                <th
                  key={heading}
                  className="pb-3 text-[11px] font-extrabold tracking-[0.1em] uppercase text-mute"
                >
                  {heading}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((member) => {
              const name = displayName(member.first_name, member.last_name, member.email);
              const gradeWord =
                member.grade_level === 9
                  ? "Freshman"
                  : member.grade_level === 10
                    ? "Sophomore"
                    : member.grade_level === 11
                      ? "Junior"
                      : member.grade_level === 12
                        ? "Senior"
                        : "—";
              return (
                <tr key={member.id} className="border-t border-edge">
                  <td className="py-3.5 pr-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-[34px] w-[34px] flex-none items-center justify-center rounded-full bg-ever-lt text-xs font-extrabold text-ever-dk">
                        {initialsFromName(name)}
                      </div>
                      <div>
                        <p className="m-0 font-bold">
                          {name}
                          {member.id === currentUserId ? " · you" : ""}
                        </p>
                        <p className="mt-0.5 text-[11px] text-mute">{member.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="py-3.5 font-bold">{gradeWord}</td>
                  <td className="py-3.5 font-extrabold">{member.total_points}</td>
                  <td className="py-3.5">
                    <MemberRoleSelect
                      role={member.role}
                      label={name}
                      disabled={isPending || member.id === currentUserId}
                      canAssignAdvisor={canAssignAdvisor}
                      onRoleChange={(role, revert) => {
                        startTransition(async () => {
                          try {
                            await setMemberRole(member.id, role);
                            router.refresh();
                          } catch (roleError) {
                            revert();
                            setError(
                              roleError instanceof Error
                                ? roleError.message
                                : "Could not update role",
                            );
                          }
                        });
                      }}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        <div className="mt-[18px] flex justify-between text-xs font-bold text-mute">
          <span>
            SHOWING {filtered.length} OF {members.length}
          </span>
          <Link href="/messages" className="text-ever-dk hover:text-ever">
            Open announcements
          </Link>
        </div>
      </div>
      {error ? <p className="mt-3 text-sm text-[#b42318]">{error}</p> : null}
    </div>
  );
}
