"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { displayName } from "@/lib/auth/display-name";
import type { SubmittedTest } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

type LeaveFilter = "all" | "left" | "stayed" | "several";
type ScoreFilter = "all" | "under50" | "mid" | "strong" | "top";
type WhenFilter = "all" | "today" | "week" | "month";

const LEAVE_FILTERS: { value: LeaveFilter; label: string }[] = [
  { value: "all", label: "Any leaves" },
  { value: "left", label: "Left the tab" },
  { value: "stayed", label: "Stayed" },
  { value: "several", label: "3 or more leaves" },
];

const SCORE_FILTERS: { value: ScoreFilter; label: string }[] = [
  { value: "all", label: "Any score" },
  { value: "under50", label: "Under 50%" },
  { value: "mid", label: "50–69%" },
  { value: "strong", label: "70–89%" },
  { value: "top", label: "90%+" },
];

const WHEN_FILTERS: { value: WhenFilter; label: string }[] = [
  { value: "all", label: "Any time" },
  { value: "today", label: "Today" },
  { value: "week", label: "This week" },
  { value: "month", label: "This month" },
];

function percent(test: SubmittedTest) {
  if (test.score == null || test.total_questions <= 0) return null;
  return Math.round((test.score / test.total_questions) * 100);
}

function startOfDay(date: Date) {
  const next = new Date(date);
  next.setHours(0, 0, 0, 0);
  return next;
}

function matchesWhen(completedAt: string, filter: WhenFilter) {
  if (filter === "all") return true;
  const completed = new Date(completedAt);
  const now = new Date();
  if (filter === "today") return completed >= startOfDay(now);
  if (filter === "week") {
    const week = startOfDay(now);
    week.setDate(week.getDate() - 6);
    return completed >= week;
  }
  const month = new Date(now.getFullYear(), now.getMonth(), 1);
  return completed >= month;
}

function matchesScore(test: SubmittedTest, filter: ScoreFilter) {
  if (filter === "all") return true;
  const score = percent(test);
  if (score == null) return false;
  if (filter === "under50") return score < 50;
  if (filter === "mid") return score >= 50 && score < 70;
  if (filter === "strong") return score >= 70 && score < 90;
  return score >= 90;
}

function matchesLeaves(test: SubmittedTest, filter: LeaveFilter) {
  if (filter === "all") return true;
  if (filter === "left") return test.tab_leave_count > 0;
  if (filter === "stayed") return test.tab_leave_count === 0;
  return test.tab_leave_count >= 3;
}

function dayKey(iso: string) {
  const date = new Date(iso);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function dayLabel(iso: string) {
  const date = new Date(iso);
  const today = startOfDay(new Date()).getTime();
  const that = startOfDay(date).getTime();
  const days = Math.round((today - that) / 86_400_000);
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "short",
    day: "numeric",
  });
}

function clock(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function leaveCopy(test: SubmittedTest) {
  if (test.tab_leave_count === 0) return "Stayed on the test";
  const questions = test.leave_questions;
  if (questions.length === 0) {
    return `${test.tab_leave_count} tab leave${test.tab_leave_count === 1 ? "" : "s"}`;
  }
  const shown = questions.slice(0, 8);
  const extra = questions.length - shown.length;
  const list = `${shown.join(", ")}${extra ? `, and ${extra} more` : ""}`;
  if (shown.length === 1 && extra === 0) return `Left the tab on question ${list}`;
  return `Left the tab on questions ${list}`;
}

function sessionLabel(sessionType: string) {
  if (sessionType === "full") return "Full exam";
  if (sessionType === "custom") return "Custom test";
  if (sessionType === "pi_targeted" || sessionType === "pi-targeted") return "PI-targeted";
  return sessionType.replaceAll("_", " ");
}

function FilterRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: { value: string; label: string }[];
  onChange: (value: string) => void;
}) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <p className="w-16 text-[11px] font-bold tracking-[0.08em] uppercase text-mute">{label}</p>
      {options.map((option) => (
        <button
          key={option.value}
          type="button"
          onClick={() => onChange(option.value)}
          className={cn(
            "rounded-full px-3.5 py-2 text-[13px] font-bold transition-[background-color,color] duration-150 ease-[cubic-bezier(0.2,0,0,1)] active:scale-[0.96]",
            value === option.value
              ? "bg-ever-dk text-white"
              : "bg-white text-ink shadow-card hover:bg-ever-lt",
          )}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function TestTimeline({ tests }: { tests: SubmittedTest[] }) {
  const [query, setQuery] = useState("");
  const [leaves, setLeaves] = useState<LeaveFilter>("all");
  const [score, setScore] = useState<ScoreFilter>("all");
  const [when, setWhen] = useState<WhenFilter>("all");
  const [grade, setGrade] = useState("all");

  const grades = useMemo(() => {
    const values = [...new Set(tests.map((test) => test.grade_level).filter((value) => value != null))];
    return values.sort((a, b) => Number(a) - Number(b));
  }, [tests]);

  const filtered = useMemo(() => {
    const needle = query.trim().toLowerCase();
    return tests.filter((test) => {
      if (!matchesLeaves(test, leaves)) return false;
      if (!matchesScore(test, score)) return false;
      if (!matchesWhen(test.completed_at, when)) return false;
      if (grade !== "all" && String(test.grade_level ?? "") !== grade) return false;
      if (!needle) return true;
      const name = displayName(test.first_name, test.last_name).toLowerCase();
      const exam = `${test.exam_title ?? ""} ${test.exam_code ?? ""}`.toLowerCase();
      const username = test.username?.toLowerCase() ?? "";
      const event = test.event_code?.toLowerCase() ?? "";
      return (
        name.includes(needle) ||
        exam.includes(needle) ||
        username.includes(needle) ||
        event.includes(needle)
      );
    });
  }, [grade, leaves, query, score, tests, when]);

  const groups = useMemo(() => {
    const buckets: { key: string; label: string; tests: SubmittedTest[] }[] = [];
    for (const test of filtered) {
      const key = dayKey(test.completed_at);
      const last = buckets[buckets.length - 1];
      if (last?.key === key) last.tests.push(test);
      else buckets.push({ key, label: dayLabel(test.completed_at), tests: [test] });
    }
    return buckets;
  }, [filtered]);

  return (
    <div>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search name, exam, or event"
        className="w-full rounded-full bg-white px-5 py-3 text-sm shadow-card placeholder:text-mute sm:w-[320px]"
      />
      <div className="mt-4 flex flex-col gap-2.5">
        <FilterRow
          label="Leaves"
          value={leaves}
          options={LEAVE_FILTERS}
          onChange={(value) => setLeaves(value as LeaveFilter)}
        />
        <FilterRow
          label="Score"
          value={score}
          options={SCORE_FILTERS}
          onChange={(value) => setScore(value as ScoreFilter)}
        />
        <FilterRow
          label="When"
          value={when}
          options={WHEN_FILTERS}
          onChange={(value) => setWhen(value as WhenFilter)}
        />
        {grades.length > 1 ? (
          <FilterRow
            label="Grade"
            value={grade}
            options={[
              { value: "all", label: "Any grade" },
              ...grades.map((value) => ({ value: String(value), label: `Grade ${value}` })),
            ]}
            onChange={setGrade}
          />
        ) : null}
      </div>

      <p className="mt-5 text-[13px] font-semibold tabular-nums text-mute">
        {filtered.length} submitted test{filtered.length === 1 ? "" : "s"}
      </p>

      {groups.length === 0 ? (
        <p className="deca-card mt-3 px-5 py-6 text-sm text-mute">
          No submitted tests match those filters.
        </p>
      ) : (
        <div className="mt-3 flex flex-col gap-6">
          {groups.map((group) => (
            <section key={group.key}>
              <h2 className="text-xs font-bold tracking-[0.1em] uppercase text-ever-dk">
                {group.label}
              </h2>
              <div className="mt-2 flex flex-col gap-2">
                {group.tests.map((test) => {
                  const name = displayName(test.first_name, test.last_name);
                  const accuracy = percent(test);
                  const left = test.tab_leave_count > 0;
                  return (
                    <article
                      key={test.session_id}
                      className="deca-card flex flex-wrap items-center gap-4 px-4 py-3.5 sm:px-5"
                    >
                      <p className="w-16 flex-none text-[13px] font-bold tabular-nums text-mute">
                        {clock(test.completed_at)}
                      </p>
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-bold text-ink">
                          <Link
                            href={`/admin/members/${test.user_id}`}
                            className="hover:text-ever-dk"
                          >
                            {name}
                          </Link>
                          {test.event_code ? (
                            <span className="font-semibold text-mute"> · {test.event_code}</span>
                          ) : null}
                        </p>
                        <p className="mt-0.5 truncate text-[13px] text-mute">
                          {test.exam_title || "Practice test"}
                          {test.exam_code ? ` · ${test.exam_code}` : ""}
                          {` · ${sessionLabel(test.session_type)}`}
                        </p>
                        <p
                          className={cn(
                            "mt-1 text-[13px] font-semibold text-pretty",
                            left ? "text-ink" : "text-mute",
                          )}
                        >
                          {leaveCopy(test)}
                        </p>
                      </div>
                      <div className="flex items-center gap-4">
                        <Link
                          href={`/tests/${test.session_id}`}
                          className="text-[13px] font-bold text-ever-dk hover:text-ever"
                        >
                          Open test
                        </Link>
                        <p className="w-16 text-right font-display text-lg font-black tabular-nums text-ink">
                          {accuracy == null ? "—" : `${accuracy}%`}
                        </p>
                      </div>
                    </article>
                  );
                })}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
