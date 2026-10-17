"use client";

import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, useTransition, type ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { SelectMenu } from "@/components/ui/select-menu";
import Link from "next/link";
import { setMemberRole } from "@/app/admin/actions";
import { DecaButton } from "@/components/deca/button";
import { initialsFromName } from "@/lib/deca/format";
import type {
  AdminOverview,
  ChapterActivity,
  ChapterMember,
  ChapterTestTabLeave,
  SolutionPeek,
} from "@/lib/platform/types";
import { displayName } from "@/lib/auth/display-name";
import { cn } from "@/lib/utils";

const SECTION_STORAGE_KEY = "admin-collapsed-sections";

type SectionId = "overview" | "activity" | "tests" | "peeks" | "members";

function useCollapsedSections() {
  const [collapsed, setCollapsed] = useState<Partial<Record<SectionId, boolean>>>({});

  useEffect(() => {
    try {
      const raw = localStorage.getItem(SECTION_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as Partial<Record<SectionId, boolean>>;
      if (parsed && typeof parsed === "object") setCollapsed(parsed);
    } catch {
      /* keep defaults */
    }
  }, []);

  function toggle(id: SectionId) {
    setCollapsed((current) => {
      const next = { ...current, [id]: !current[id] };
      localStorage.setItem(SECTION_STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }

  return { collapsed, toggle };
}

function AdminSection({
  id,
  title,
  description,
  count,
  open,
  onToggle,
  actions,
  children,
}: {
  id: SectionId;
  title: string;
  description?: string;
  count?: number;
  open: boolean;
  onToggle: (id: SectionId) => void;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="deca-card mt-4 px-[30px] py-[22px]">
      <div className="flex items-start justify-between gap-4">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={`admin-section-${id}`}
          onClick={() => onToggle(id)}
          className="flex min-h-10 min-w-0 flex-1 cursor-pointer items-center gap-3 text-left"
        >
          <ChevronDown
            aria-hidden
            className={cn(
              "h-5 w-5 flex-none text-mute transition-transform duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
              !open && "-rotate-90",
            )}
          />
          <span className="min-w-0">
            <span className="flex flex-wrap items-center gap-2">
              <span className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-balance">
                {title}
              </span>
              {typeof count === "number" ? (
                <span className="rounded-full bg-ground px-2.5 py-0.5 text-[11px] font-extrabold tabular-nums text-mute">
                  {count}
                </span>
              ) : null}
            </span>
            {description ? (
              <span className="mt-1 block text-pretty text-xs text-mute">{description}</span>
            ) : null}
          </span>
        </button>
        {actions ? <div className="flex flex-none items-center gap-2 pt-0.5">{actions}</div> : null}
      </div>
      <div
        id={`admin-section-${id}`}
        className={cn(
          "grid transition-[grid-template-rows] duration-200 ease-[cubic-bezier(0.2,0,0,1)]",
          open ? "grid-rows-[1fr]" : "grid-rows-[0fr]",
        )}
      >
        <div className="overflow-hidden">
          <div className="overflow-x-auto pt-4">{children}</div>
        </div>
      </div>
    </section>
  );
}

type AdminPanelProps = {
  overview: AdminOverview;
  members: ChapterMember[];
  activity: ChapterActivity[];
  recentTests: ChapterTestTabLeave[];
  solutionPeeks: SolutionPeek[];
  currentUserId: string;
  currentRole: "officer" | "advisor";
  currentIsSuperAdmin: boolean;
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
  recentTests,
  solutionPeeks,
  currentUserId,
  currentRole,
  currentIsSuperAdmin,
}: AdminPanelProps) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [isPending, startTransition] = useTransition();
  const { collapsed, toggle } = useCollapsedSections();
  const canAssignAdvisor = currentRole === "advisor";

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      if (filter === "officers" && member.role === "student") return false;
      if (filter === "students" && member.role !== "student") return false;
      if (!needle) return true;
      const name = displayName(member.first_name, member.last_name, member.email).toLowerCase();
      const username = member.username?.toLowerCase() ?? "";
      const email = member.email?.toLowerCase() ?? "";
      return name.includes(needle) || username.includes(needle) || email.includes(needle);
    });
  }, [filter, members, query]);
  const visibleIds = useMemo(() => new Set(filtered.map((member) => member.id)), [filtered]);
  const filteredActivity = activity.filter((row) => visibleIds.has(row.user_id));
  const filteredTests = recentTests.filter((row) => visibleIds.has(row.user_id));
  const filteredPeeks = solutionPeeks.filter((row) => visibleIds.has(row.user_id));
  const officerCount = members.filter((member) => member.role !== "student").length;
  const studentCount = members.length - officerCount;

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
            placeholder="Search name or username"
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
            ["all", `All · ${members.length}`],
            ["officers", `Officers · ${officerCount}`],
            ["students", `Students · ${studentCount}`],
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
        <Link
          href="/admin/calendar"
          className="rounded-full bg-white px-4 py-2 text-[13px] font-semibold text-[#4b463c] shadow-card hover:text-ever-dk"
        >
          Calendar
        </Link>
      </div>

      {currentIsSuperAdmin ? (
        <p className="mt-4 max-w-3xl text-sm leading-6 text-pretty text-ink-2">
          Super admin. Open any member to change their username, password, event, role, or to give super admin to someone else.
        </p>
      ) : null}

      <AdminSection
        id="overview"
        title="Overview"
        open={!collapsed.overview}
        onToggle={toggle}
      >
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-3 xl:grid-cols-6">
          {[
            [overview.student_count, "Active members"],
            [overview.tests_this_week, "Tests this week"],
            [overview.tests_completed_total ?? 0, "Tests completed"],
            [overview.roleplays_submitted_total ?? 0, "Roleplays submitted"],
            [overview.roleplays_graded_total ?? 0, "Roleplays graded"],
            [overview.tab_blur_events_total ?? 0, "Tab leaves logged"],
          ].map(([value, label]) => (
            <div key={label} className="rounded-2xl bg-ground px-5 py-4">
              <p className="font-display text-[34px] font-black tracking-[-0.035em] tabular-nums">
                {value}
              </p>
              <p className="mt-1 text-[13px] font-semibold text-mute">{label}</p>
            </div>
          ))}
        </div>
      </AdminSection>

      <AdminSection
        id="activity"
        title="Member activity"
        count={filteredActivity.length}
        open={!collapsed.activity}
        onToggle={toggle}
        actions={
          <Link
            href="/admin/grading"
            className="rounded-full bg-ever-dk px-4 py-2 text-[13px] font-bold text-white hover:text-white"
          >
            Grade queue · {overview.pending_submissions}
          </Link>
        }
      >
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
            {filteredActivity.map((row) => {
              const name = displayName(row.first_name, row.last_name, row.email);
              return (
                <tr key={row.user_id} className="border-t border-edge">
                  <td className="py-3 pr-3 font-bold">
                    <Link href={`/admin/members/${row.user_id}`} className="hover:text-ever-dk">
                      {name}
                    </Link>
                  </td>
                  <td className="py-3">{row.tests_completed}</td>
                  <td className="py-3">{row.avg_test_pct ?? "—"}</td>
                  <td className="py-3">
                    {row.roleplays_graded}/{row.roleplays_submitted}
                  </td>
                  <td className="py-3">{row.avg_roleplay_score ?? "—"}</td>
                  <td
                    className={cn(
                      "py-3 font-extrabold tabular-nums",
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
      </AdminSection>

      <AdminSection
        id="tests"
        title="Recent tests"
        count={filteredTests.length}
        open={!collapsed.tests}
        onToggle={toggle}
      >
        {filteredTests.length === 0 ? (
          <p className="text-[13px] text-mute">No completed tests yet.</p>
        ) : (
          <table className="w-full border-collapse text-left text-[13px]">
            <thead>
              <tr>
                {["Member", "Exam", "Completed", "Score", "Tab leaves"].map((heading) => (
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
              {filteredTests.map((row) => {
                const name = displayName(row.first_name, row.last_name, row.email);
                const completed = new Date(row.completed_at).toLocaleString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                });
                const exam =
                  [row.exam_code, row.exam_title].filter(Boolean).join(" · ") || "Practice test";
                return (
                  <tr key={row.session_id} className="border-t border-edge">
                    <td className="py-3 pr-3 font-bold">
                      <Link href={`/admin/members/${row.user_id}`} className="hover:text-ever-dk">
                        {name}
                      </Link>
                    </td>
                    <td className="py-3 pr-3">
                      <Link
                        href={`/tests/${row.session_id}`}
                        className="font-bold text-ever-dk hover:text-ever"
                      >
                        {exam}
                      </Link>
                    </td>
                    <td className="py-3 tabular-nums">{completed}</td>
                    <td className="py-3 tabular-nums">
                      {row.score ?? 0}/{row.total_questions}
                    </td>
                    <td
                      className={cn(
                        "py-3 font-extrabold tabular-nums",
                        row.tab_leave_count > 0 ? "text-gold" : "text-mute",
                      )}
                    >
                      {row.tab_leave_count}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </AdminSection>

      <AdminSection
        id="peeks"
        title="Checked solution before an attempt"
        count={filteredPeeks.length}
        open={!collapsed.peeks}
        onToggle={toggle}
      >
        {filteredPeeks.length === 0 ? (
          <p className="text-[13px] text-mute">No solution checks yet.</p>
        ) : (
          <table className="w-full border-collapse text-left text-[13px]">
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
              {filteredPeeks.map((peek) => {
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
                    <td className="py-3 pr-3 font-bold">
                      <Link href={`/admin/members/${peek.user_id}`} className="hover:text-ever-dk">
                        {name}
                      </Link>
                    </td>
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
      </AdminSection>

      <AdminSection
        id="members"
        title="Members"
        count={filtered.length}
        open={!collapsed.members}
        onToggle={toggle}
      >
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
                          <Link href={`/admin/members/${member.id}`} className="hover:text-ever-dk">
                            {name}
                          </Link>
                          {member.id === currentUserId ? " · you" : ""}
                          {member.is_super_admin ? " · super admin" : ""}
                        </p>
                        <p className="mt-0.5 text-[11px] text-mute">
                          {member.username ? `@${member.username}` : member.email}
                          {member.event_code ? ` · ${member.event_code}` : ""}
                        </p>
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
        <div className="mt-[18px] flex justify-between text-xs font-bold tabular-nums text-mute">
          <span>
            SHOWING {filtered.length} OF {members.length}
          </span>
          <Link href="/messages" className="text-ever-dk hover:text-ever">
            Open announcements
          </Link>
        </div>
      </AdminSection>
      {error ? <p className="mt-3 text-sm text-[#b42318]">{error}</p> : null}
    </div>
  );
}
