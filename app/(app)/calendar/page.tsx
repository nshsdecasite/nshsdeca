import type { Metadata } from "next";
import { listUpcomingChapterEvents } from "@/app/calendar/actions";
import { DecaButton } from "@/components/deca/button";
import { EventsScreen } from "@/components/deca/events-screen";
import { getUserRole, requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Events",
};

export default async function CalendarPage() {
  const user = await requireAuth("/calendar");
  const [events, role] = await Promise.all([
    listUpcomingChapterEvents(),
    getUserRole(user.id),
  ]);
  const canManage = role === "officer" || role === "advisor";

  return (
    <div>
      {canManage ? (
        <div className="mb-2 flex justify-end">
          <DecaButton href="/admin/calendar" variant="tint" size="sm">
            Manage calendar
          </DecaButton>
        </div>
      ) : null}
      <EventsScreen events={events} />
    </div>
  );
}
