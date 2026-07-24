"use client";

import { useTransition } from "react";
import { createAnnouncement, deleteAnnouncement } from "@/app/admin/actions";
import type { AdminOverview } from "@/lib/platform/types";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

type AdminPanelProps = {
  overview: AdminOverview;
};

export function AdminPanel({ overview }: AdminPanelProps) {
  const [isPending, startTransition] = useTransition();

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
            <p className="mt-2 text-3xl font-bold tabular-nums text-foreground">{stat.value}</p>
          </Card>
        ))}
      </div>

      <Card className="p-6">
        <form
          onSubmit={(event) => {
            event.preventDefault();
            const formData = new FormData(event.currentTarget);
            startTransition(async () => {
              await createAnnouncement(formData);
              event.currentTarget.reset();
              window.location.reload();
            });
          }}
        >
          <h2 className="text-lg font-semibold text-foreground">Post announcement</h2>
          <div className="mt-4">
            <Label htmlFor="announcement-message">Message</Label>
            <textarea
              id="announcement-message"
              name="message"
              rows={4}
              required
              className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            />
          </div>
          <div className="mt-4">
            <Label htmlFor="announcement-visible-to">Visible to</Label>
            <select
              id="announcement-visible-to"
              name="visible_to"
              defaultValue="all"
              className="mt-2 w-full rounded-xl border border-input bg-card px-4 py-3 text-sm text-foreground shadow-border outline-none transition-[box-shadow,border-color] focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <option value="all">Everyone</option>
              <option value="students">Students only</option>
              <option value="officers">Officers only</option>
            </select>
          </div>
          <Button type="submit" disabled={isPending} className="mt-4">
            {isPending ? "Posting…" : "Post announcement"}
          </Button>
        </form>
      </Card>

      <Card className="p-6">
        <section>
          <h2 className="text-lg font-semibold text-foreground">Recent announcements</h2>
          {overview.announcements?.length ? (
            <ul className="mt-4 space-y-3">
              {overview.announcements.map((announcement) => (
                <li
                  key={announcement.id}
                  className="flex items-start justify-between gap-4 rounded-2xl bg-muted px-4 py-3"
                >
                  <div>
                    <p className="text-sm text-foreground">{announcement.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {announcement.visible_to} ·{" "}
                      {new Date(announcement.created_at).toLocaleString()}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={isPending}
                    onClick={() =>
                      startTransition(async () => {
                        await deleteAnnouncement(announcement.id);
                        window.location.reload();
                      })
                    }
                    className="text-destructive hover:text-destructive"
                  >
                    Delete
                  </Button>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No announcements yet.</p>
          )}
        </section>
      </Card>
    </div>
  );
}
