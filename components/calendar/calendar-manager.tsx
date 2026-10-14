"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  createChapterEvent,
  deleteChapterEvent,
} from "@/app/calendar/actions";
import { ChapterEventRow } from "@/components/calendar/chapter-event-list";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { isUpcomingEvent } from "@/lib/calendar/format";
import type { ChapterEvent } from "@/lib/platform/types";

function toIsoFromLocal(value: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString();
}

export function CalendarManager({ events }: { events: ChapterEvent[] }) {
  const router = useRouter();
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();
  const upcoming = events.filter((event) => isUpcomingEvent(event));
  const past = events.filter((event) => !isUpcomingEvent(event)).reverse();

  return (
    <div className="grid gap-8 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
      <form
        className="space-y-4 rounded-[6px] border border-edge bg-white p-5"
        onSubmit={(event) => {
          event.preventDefault();
          const form = event.currentTarget;
          const formData = new FormData(form);
          formData.set("starts_at", toIsoFromLocal(String(formData.get("starts_at") ?? "")));
          const endsRaw = String(formData.get("ends_at") ?? "");
          if (endsRaw) {
            formData.set("ends_at", toIsoFromLocal(endsRaw));
          } else {
            formData.delete("ends_at");
          }
          setError("");
          startTransition(async () => {
            try {
              await createChapterEvent(formData);
              form.reset();
              router.refresh();
            } catch (saveError) {
              setError(
                saveError instanceof Error
                  ? saveError.message
                  : "Could not add that event.",
              );
            }
          });
        }}
      >
        <div>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink">
            Add an event
          </h2>
          <p className="mt-1 text-sm text-ink-2">
            It shows up on the homepage and in every member calendar.
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="event-title">Title</Label>
          <Input id="event-title" name="title" required maxLength={120} placeholder="Roleplay bootcamp" />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="event-location">Location</Label>
          <Input
            id="event-location"
            name="location"
            maxLength={160}
            placeholder="Room C114"
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-1.5">
            <Label htmlFor="event-starts">Starts</Label>
            <Input id="event-starts" name="starts_at" type="datetime-local" required />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="event-ends">Ends (optional)</Label>
            <Input id="event-ends" name="ends_at" type="datetime-local" />
          </div>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="event-detail">Details</Label>
          <textarea
            id="event-detail"
            name="detail"
            rows={3}
            maxLength={500}
            placeholder="Dues open the same week. Bring a laptop."
            className="w-full rounded-[6px] border border-edge bg-white px-3.5 py-2.5 text-sm text-ink placeholder:text-mute"
          />
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button type="submit" disabled={isPending}>
          {isPending ? "Adding…" : "Add to calendar"}
        </Button>
      </form>

      <div className="space-y-8">
        <section>
          <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink">
            Upcoming
          </h2>
          <div className="mt-3">
            {upcoming.length ? (
              <ul>
                {upcoming.map((event) => (
                  <ManagedEventRow
                    key={event.id}
                    event={event}
                    disabled={isPending}
                    onDelete={() =>
                      startTransition(async () => {
                        await deleteChapterEvent(event.id);
                        router.refresh();
                      })
                    }
                  />
                ))}
              </ul>
            ) : (
              <p className="text-sm leading-relaxed text-ink-2">
                Nothing on the calendar yet.
              </p>
            )}
          </div>
        </section>

        {past.length ? (
          <section>
            <h2 className="font-display text-xl font-extrabold tracking-[-0.02em] text-ink">
              Past
            </h2>
            <ul className="mt-3">
              {past.map((event) => (
                <ManagedEventRow
                  key={event.id}
                  event={event}
                  disabled={isPending}
                  onDelete={() =>
                    startTransition(async () => {
                      await deleteChapterEvent(event.id);
                      router.refresh();
                    })
                  }
                />
              ))}
            </ul>
          </section>
        ) : null}
      </div>
    </div>
  );
}

function ManagedEventRow({
  event,
  disabled,
  onDelete,
}: {
  event: ChapterEvent;
  disabled: boolean;
  onDelete: () => void;
}) {
  return (
    <li className="flex items-start justify-between gap-4 border-b border-hair py-4 last:border-b-0">
      <ChapterEventRow event={event} className="min-w-0 flex-1" />
      <Button
        type="button"
        variant="ghost"
        size="sm"
        disabled={disabled}
        onClick={onDelete}
        className="mt-3 shrink-0 text-destructive hover:text-destructive"
      >
        Delete
      </Button>
    </li>
  );
}
