/** Through Monday, October 26, 2026, 4:00 p.m. Central. */
const WINDOW_END_YEAR = 2026;
const WINDOW_END_MONTH = 10;
const WINDOW_END_DAY = 26;
const WINDOW_END_MINUTES = 16 * 60;

export const ASSIGNED_EXAM_YEAR = 2023;
export const FALLBACK_EXAM_YEAR = 2022;

export const ASSIGNED_EXAM_LOCK_MESSAGE =
  "Only your assigned exam is open until 4:00 p.m. Central on Monday. Submit it and the rest unlock.";

function centralParts(now: Date) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "America/Chicago",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);
  const value = (type: Intl.DateTimeFormatPartTypes) =>
    Number(parts.find((part) => part.type === type)?.value ?? "0");
  return {
    year: value("year"),
    month: value("month"),
    day: value("day"),
    minutes: value("hour") * 60 + value("minute"),
  };
}

export function isAssignedExamWindow(now = new Date()) {
  const parts = centralParts(now);
  if (parts.year !== WINDOW_END_YEAR) return parts.year < WINDOW_END_YEAR;
  if (parts.month !== WINDOW_END_MONTH) return parts.month < WINDOW_END_MONTH;
  if (parts.day !== WINDOW_END_DAY) return parts.day < WINDOW_END_DAY;
  return parts.minutes < WINDOW_END_MINUTES;
}

export function hasCompletedAssignedExam(
  sessions: {
    session_type: string;
    completed_at: string | null;
    exam_year: number | null;
    cluster_name: string | null;
  }[],
  clusterSlug: string | null | undefined,
  clusterName: string | null | undefined,
  exams: { year: number; cluster_slug: string }[],
) {
  const year = assignedExamYear(clusterSlug, exams);
  if (year == null || !clusterName) return false;
  return sessions.some(
    (session) =>
      session.session_type === "full" &&
      Boolean(session.completed_at) &&
      session.exam_year === year &&
      session.cluster_name === clusterName,
  );
}

export function assignedExamYear(
  clusterSlug: string | null | undefined,
  exams: { year: number; cluster_slug: string }[],
) {
  if (!clusterSlug) return null;
  const years = new Set(
    exams.filter((exam) => exam.cluster_slug === clusterSlug).map((exam) => exam.year),
  );
  if (years.has(ASSIGNED_EXAM_YEAR)) return ASSIGNED_EXAM_YEAR;
  if (years.has(FALLBACK_EXAM_YEAR)) return FALLBACK_EXAM_YEAR;
  return null;
}

export function examIsAssigned(
  exam: { year: number; cluster_slug: string },
  clusterSlug: string | null | undefined,
  exams: { year: number; cluster_slug: string }[],
) {
  const year = assignedExamYear(clusterSlug, exams);
  return year != null && exam.year === year && exam.cluster_slug === clusterSlug;
}
