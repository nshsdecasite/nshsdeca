import type { Metadata } from "next";
import { listAllChapterEvents } from "@/app/calendar/actions";
import { CalendarManager } from "@/components/calendar/calendar-manager";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { requireRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Chapter calendar",
};

export default async function AdminCalendarPage() {
  await requireRole(["officer", "advisor"], "/admin/calendar");
  const events = await listAllChapterEvents();

  return (
    <SocialPage size="wide">
      <PageHeader
        backHref="/admin"
        backLabel="Admin"
        eyebrow="Officers"
        title="Chapter calendar"
      />
      <CalendarManager events={events} />
    </SocialPage>
  );
}
