"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { DecaButton } from "@/components/deca/button";
import { initialsFromName } from "@/lib/deca/format";
import { TestTimeline } from "@/components/platform/test-timeline";
import type { AdminOverview, ChapterMember, SubmittedTest } from "@/lib/platform/types";
import { displayName } from "@/lib/auth/display-name";
import { cn } from "@/lib/utils";

type AdminPanelProps = {
  overview: AdminOverview;
  members: ChapterMember[];
  tests: SubmittedTest[];
  currentUserId: string;
  currentIsSuperAdmin: boolean;
};

type Section = "members" | "tests";

type Filter = "all" | "officers" | "students";

function gradeWord(grade: number | null) {
  if (grade === 9) return "Freshman";
  if (grade === 10) return "Sophomore";
  if (grade === 11) return "Junior";
  if (grade === 12) return "Senior";
  return "No grade";
}

function downloadCsv(filename: string, rows: string[][]) {
  const csv = rows
    .map((row) =>
      row.map((cell) => `"${String(cell ?? "").replaceAll('"', '""')}"`).join(","),
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
  tests,
  currentUserId,
  currentIsSuperAdmin,
}: AdminPanelProps) {
  const [section, setSection] = useState<Section>("members");
  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const officerCount = members.filter((member) => member.role !== "student").length;
  const studentCount = members.length - officerCount;

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return members.filter((member) => {
      if (filter === "officers" && member.role === "student") return false;
      if (filter === "students" && member.role !== "student") return false;
      if (!needle) return true;
      const name = displayName(member.first_name, member.last_name, member.email).toLowerCase();
      const username = member.username?.toLowerCase() ?? "";
      const event = member.event_code?.toLowerCase() ?? "";
      return name.includes(needle) || username.includes(needle) || event.includes(needle);
    });
  }, [filter, members, query]);

  const exportMembers = () => {
    downloadCsv("chapter-members.csv", [
      ["First name", "Last name", "Username", "Grade", "Event", "Role", "Points"],
      ...members.map((member) => [
        member.first_name ?? "",
        member.last_name ?? "",
        member.username ?? "",
        member.grade_level?.toString() ?? "",
        member.event_code ?? "",
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
            {currentIsSuperAdmin ? "Super admin" : "Chapter admin"}
          </p>
          <h1 className="mt-2.5 text-balance font-display text-[40px] font-black tracking-[-0.04em]">
            {section === "members" ? "Members" : "Submitted tests"}
          </h1>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-pretty text-ink-2">
            {section === "tests"
              ? "Newest submissions first. Filter by who left the tab, how they scored, and when they finished."
              : currentIsSuperAdmin
                ? "Open someone to see everything they have done, and to change their event, grade, role, or account."
                : "Open someone to see their tests, roleplays, and the rest of their record. Changes stay with super admins."}
          </p>
        </div>
        {section === "members" ? (
          <DecaButton variant="outline" onClick={exportMembers}>
            Export CSV
          </DecaButton>
        ) : null}
      </div>

      <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          [members.length, "Members"],
          [overview.tests_completed_total ?? 0, "Tests finished"],
          [overview.roleplays_submitted_total ?? 0, "Roleplays"],
          [overview.pending_submissions, "Waiting for a grade"],
        ].map(([value, label]) => (
          <div key={label} className="deca-card px-4 py-4">
            <p className="font-display text-[28px] font-black tracking-[-0.03em] tabular-nums">{value}</p>
            <p className="mt-1 text-[13px] font-semibold text-mute">{label}</p>
          </div>
        ))}
      </div>

      {currentIsSuperAdmin ? (
        <div className="mt-4 flex flex-wrap gap-2">
          <Link
            href="/admin/grading"
            className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-ink shadow-card transition-[background-color,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-ever-lt hover:text-ever-dk"
          >
            Grade queue · {overview.pending_submissions}
          </Link>
          <Link
            href="/admin/generated"
            className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-ink shadow-card transition-[background-color,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-ever-lt hover:text-ever-dk"
          >
            Generated reviews
          </Link>
          <Link
            href="/admin/calendar"
            className="rounded-full bg-white px-4 py-2 text-[13px] font-bold text-ink shadow-card transition-[background-color,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-ever-lt hover:text-ever-dk"
          >
            Calendar
          </Link>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {(
          [
            ["members", `Members · ${members.length}`],
            ["tests", `Tests · ${tests.length}`],
          ] as const
        ).map(([value, label]) => (
          <button
            key={value}
            type="button"
            onClick={() => setSection(value)}
            className={cn(
              "rounded-full px-4 py-2 text-[13px] font-bold transition-[background-color,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96]",
              section === value ? "bg-ever-dk text-white" : "bg-white text-ink shadow-card hover:bg-ever-lt",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {section === "tests" ? (
        <div className="mt-5">
          <TestTimeline tests={tests} />
        </div>
      ) : null}

      {section === "members" ? (
      <>
      <div className="mt-6 flex flex-wrap items-center gap-2">
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search name, username, or event"
          className="w-full rounded-full bg-white px-5 py-3 text-sm shadow-card placeholder:text-mute sm:w-[280px]"
        />
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
              "rounded-full px-4 py-2 text-[13px] font-bold transition-[background-color,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96]",
              filter === value ? "bg-ever-dk text-white" : "bg-white text-ink shadow-card hover:bg-ever-lt",
            )}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-col gap-2">
        {filtered.length === 0 ? (
          <p className="deca-card px-5 py-6 text-sm text-mute">No members match that search.</p>
        ) : (
          filtered.map((member) => {
            const name = displayName(member.first_name, member.last_name, member.email);
            return (
              <Link
                key={member.id}
                href={`/admin/members/${member.id}`}
                className="deca-card flex items-center gap-4 px-4 py-3.5 transition-[background-color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] hover:bg-ever-lt sm:px-5"
              >
                <div className="flex h-11 w-11 flex-none items-center justify-center rounded-full bg-ever-lt text-sm font-extrabold text-ever-dk">
                  {initialsFromName(name)}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-bold text-ink">
                    {name}
                    {member.id === currentUserId ? " · you" : ""}
                    {member.is_super_admin ? " · super admin" : ""}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-mute">
                    {member.username ? `@${member.username}` : "No username"}
                    {member.event_code ? ` · ${member.event_code}` : " · No event"}
                    {member.event_name ? ` · ${member.event_name}` : ""}
                  </p>
                </div>
                <div className="hidden text-right sm:block">
                  <p className="text-[13px] font-bold text-ink">{gradeWord(member.grade_level)}</p>
                  <p className="mt-0.5 text-[11px] font-bold uppercase tracking-[0.06em] text-mute">
                    {member.role}
                  </p>
                </div>
                <p className="w-12 text-right font-display text-lg font-black tabular-nums text-ink">
                  {member.total_points}
                </p>
              </Link>
            );
          })
        )}
      </div>
      </>
      ) : null}
    </div>
  );
}
