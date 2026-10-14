import type { Metadata } from "next";
import { listUpcomingChapterEvents } from "@/app/calendar/actions";
import { EventsScreen } from "@/components/deca/events-screen";

export const metadata: Metadata = {
  title: "Events",
};

export default async function EventsPage() {
  const events = await listUpcomingChapterEvents();
  return <EventsScreen publicNav events={events} />;
}
