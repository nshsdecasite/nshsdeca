import type { ChapterEvent } from "@/lib/platform/types";

const dateFmt: Intl.DateTimeFormatOptions = {
  weekday: "short",
  month: "short",
  day: "numeric",
};

const timeFmt: Intl.DateTimeFormatOptions = {
  hour: "numeric",
  minute: "2-digit",
};

export function eventMonthDay(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  const month = date.toLocaleDateString("en-US", { month: "short" }).toUpperCase();
  const day = String(date.getDate()).padStart(2, "0");
  return `${month} ${day}`;
}

export function eventTime(iso: string) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("en-US", timeFmt);
}

export function eventWhen(event: ChapterEvent) {
  const start = new Date(event.starts_at);
  if (Number.isNaN(start.getTime())) return "";

  const datePart = start.toLocaleDateString("en-US", dateFmt);
  const startTime = start.toLocaleTimeString("en-US", timeFmt);

  if (!event.ends_at) {
    return `${datePart} · ${startTime}`;
  }

  const end = new Date(event.ends_at);
  if (Number.isNaN(end.getTime())) {
    return `${datePart} · ${startTime}`;
  }

  const sameDay = start.toDateString() === end.toDateString();
  const endTime = end.toLocaleTimeString("en-US", timeFmt);
  if (sameDay) {
    return `${datePart} · ${startTime}–${endTime}`;
  }

  const endDate = end.toLocaleDateString("en-US", dateFmt);
  return `${datePart} ${startTime} – ${endDate} ${endTime}`;
}

export function isUpcomingEvent(event: ChapterEvent, now = Date.now()) {
  return new Date(event.starts_at).getTime() >= now - 2 * 60 * 60 * 1000;
}

export function eventDateRangeLabel(event: ChapterEvent) {
  const start = new Date(event.starts_at);
  if (Number.isNaN(start.getTime())) return "";
  const month = start.toLocaleDateString("en-US", { month: "short" });
  const startDay = start.getDate();
  if (!event.ends_at) return `${month} ${startDay}`;

  const end = new Date(event.ends_at);
  if (Number.isNaN(end.getTime()) || start.toDateString() === end.toDateString()) {
    return `${month} ${startDay}`;
  }
  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${month} ${startDay}–${end.getDate()}`;
  }
  return `${month} ${startDay} – ${end.toLocaleDateString("en-US", { month: "short" })} ${end.getDate()}`;
}

export function eventWeekdayRangeLabel(event: ChapterEvent) {
  const start = new Date(event.starts_at);
  if (Number.isNaN(start.getTime())) return "";
  if (!event.ends_at) {
    return start.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  }
  const end = new Date(event.ends_at);
  if (Number.isNaN(end.getTime()) || start.toDateString() === end.toDateString()) {
    return start.toLocaleDateString("en-US", { weekday: "long" }).toUpperCase();
  }
  const startDay = start.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  const endDay = end.toLocaleDateString("en-US", { weekday: "short" }).toUpperCase();
  return `${startDay}–${endDay}`;
}

export function eventBadge(event: ChapterEvent) {
  const title = event.title.toLowerCase();
  if (
    title.includes("conference") ||
    title.includes("cdc") ||
    title.includes("icdc")
  ) {
    return "CONFERENCE";
  }
  return "CHAPTER";
}
