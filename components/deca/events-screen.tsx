"use client";

import { useState } from "react";
import { SiteNav } from "@/components/deca/site-nav";
import { SEASON_EVENTS } from "@/lib/deca/placeholder";
import {
  eventBadge,
  eventDateRangeLabel,
  eventWeekdayRangeLabel,
} from "@/lib/calendar/format";
import type { ChapterEvent } from "@/lib/platform/types";
import { cn } from "@/lib/utils";

type DisplayEvent = {
  key: string;
  date: string;
  weekday: string;
  name: string;
  detail: string;
  badge: string;
  tone: "now" | "open" | "later";
};

const BADGE: Record<DisplayEvent["tone"], string> = {
  now: "bg-ever-dk text-white",
  open: "bg-ever-lt text-ever-dk",
  later: "bg-ground text-mute",
};

function displayEvents(events: ChapterEvent[]): DisplayEvent[] {
  if (events.length > 0) {
    return events.map((event, index) => ({
      key: event.id,
      date: eventDateRangeLabel(event),
      weekday: eventWeekdayRangeLabel(event),
      name: event.title,
      detail: [event.location, event.detail].filter(Boolean).join(" · "),
      badge: eventBadge(event),
      tone: index === 0 ? "now" : index === 1 ? "open" : "later",
    }));
  }

  return SEASON_EVENTS.map((event) => ({
    key: event.name,
    date: event.date,
    weekday: event.weekday,
    name: event.name,
    detail: event.detail,
    badge: event.badge,
    tone: event.tone,
  }));
}

export function EventsScreen({
  publicNav = false,
  events = [],
}: {
  publicNav?: boolean;
  events?: ChapterEvent[];
}) {
  const [view, setView] = useState<"timeline" | "month">("timeline");
  const items = displayEvents(events);

  return (
    <>
      {publicNav ? <SiteNav active="events" /> : null}
      <div
        className={
          publicNav
            ? "mx-auto w-full max-w-3xl px-5 pb-11 pt-9 sm:px-8 lg:w-[70%] lg:max-w-[1100px] lg:px-0"
            : "pb-2"
        }
      >
        <div className="flex flex-col items-center gap-6 text-center sm:flex-row sm:items-end sm:justify-between sm:text-left">
          <div>
            <h1 className="font-display text-[40px] font-black tracking-[-0.04em] text-balance">
              The season
            </h1>
            <p className="mt-2.5 text-pretty text-sm text-ink-2">
              Key chapter dates and the three conferences that matter.
            </p>
          </div>
          <div className="flex rounded-full bg-white p-[5px] text-[13px] font-bold shadow-card">
            <button
              type="button"
              onClick={() => setView("timeline")}
              className={cn(
                "rounded-full px-[18px] py-2",
                view === "timeline" ? "bg-ever-dk text-white" : "text-ink-2",
              )}
            >
              Timeline
            </button>
            <button
              type="button"
              onClick={() => setView("month")}
              className={cn(
                "rounded-full px-[18px] py-2",
                view === "month" ? "bg-ever-dk text-white" : "text-ink-2",
              )}
            >
              Month
            </button>
          </div>
        </div>

        {view === "month" ? (
          <div className="deca-card mt-8 grid gap-3 p-7 sm:grid-cols-2">
            {items.map((event) => (
              <div key={event.key} className="rounded-2xl bg-ground px-5 py-4">
                <p className="font-display text-2xl font-black tracking-[-0.03em]">
                  {event.date}
                </p>
                <p className="mt-1 text-[11px] font-bold tracking-[0.1em] text-mute">
                  {event.weekday}
                </p>
                <h3 className="mt-3 font-display text-[17px] font-extrabold tracking-[-0.02em] text-balance">
                  {event.name}
                </h3>
                <p className="mt-1 text-pretty text-[13px] text-ink-2">{event.detail}</p>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative mt-8 pl-9">
            <div className="absolute top-2 bottom-2 left-[11px] w-[3px] rounded-full bg-[#dde3d3]" />
            <div className="flex flex-col gap-3.5">
              {items.map((event, index) => (
                <div key={event.key} className="relative">
                  <div
                    className={cn(
                      "absolute rounded-full",
                      index === 0
                        ? "-left-[33px] top-[26px] h-[17px] w-[17px] border-4 border-ground bg-ever-dk"
                        : "-left-[30px] top-[29px] h-[11px] w-[11px] bg-acc-mid",
                    )}
                  />
                  <div
                    className={cn(
                      "deca-card grid items-center gap-6 px-7 py-6 md:grid-cols-[130px_1fr_max-content]",
                      index === 0 && "border-[1.5px] border-ever",
                    )}
                  >
                    <div>
                      <p className="font-display text-2xl font-black tracking-[-0.03em]">
                        {event.date}
                      </p>
                      <p className="mt-1 text-[11px] font-bold tracking-[0.1em] text-mute">
                        {event.weekday}
                      </p>
                    </div>
                    <div>
                      <h3 className="font-display text-[19px] font-extrabold tracking-[-0.02em] text-balance">
                        {event.name}
                      </h3>
                      <p className="mt-1 text-pretty text-[13px] text-ink-2">{event.detail}</p>
                    </div>
                    <span
                      className={cn(
                        "rounded-full px-3.5 py-1.5 text-[11px] font-extrabold",
                        BADGE[event.tone],
                      )}
                    >
                      {event.badge}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
