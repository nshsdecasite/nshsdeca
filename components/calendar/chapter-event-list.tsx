import type { ChapterEvent } from "@/lib/platform/types";
import { eventMonthDay, eventTime, eventWhen } from "@/lib/calendar/format";
import { cn } from "@/lib/utils";

export function ChapterEventRow({
  event,
  className,
}: {
  event: ChapterEvent;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "grid grid-cols-[108px_1fr] items-start gap-4 sm:grid-cols-[128px_1fr] sm:gap-5",
        className,
      )}
    >
      <div>
        <p className="font-mono text-[clamp(1.35rem,1.8vw,1.65rem)] font-semibold leading-none tabular text-ever">
          {eventMonthDay(event.starts_at)}
        </p>
        <p className="mt-1.5 font-mono text-[15px] tabular text-mute">
          {eventTime(event.starts_at)}
        </p>
      </div>
      <div>
        <p className="m-0 font-display text-[clamp(1.15rem,1.5vw,1.35rem)] font-semibold tracking-[-0.015em] text-ink">
          {event.title}
        </p>
        {event.location ? (
          <p className="mt-1 text-[15px] text-ink-2">{event.location}</p>
        ) : null}
        {event.detail ? (
          <p className="mt-1 text-[15px] leading-[1.55] text-ink-2">{event.detail}</p>
        ) : null}
        <p className="sr-only">{eventWhen(event)}</p>
      </div>
    </div>
  );
}

export function ChapterEventList({
  events,
  empty = "No upcoming events yet.",
}: {
  events: ChapterEvent[];
  empty?: string;
}) {
  if (!events.length) {
    return <p className="text-sm leading-relaxed text-ink-2">{empty}</p>;
  }

  return (
    <ul>
      {events.map((event, index) => (
        <li
          key={event.id}
          className={cn(
            "py-4",
            index < events.length - 1 && "border-b border-hair",
          )}
        >
          <ChapterEventRow event={event} />
        </li>
      ))}
    </ul>
  );
}
