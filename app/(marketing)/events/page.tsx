import type { Metadata } from "next";
import { EventsScreen } from "@/components/deca/events-screen";

export const metadata: Metadata = {
  title: "Events",
};

export default function EventsPage() {
  return <EventsScreen publicNav />;
}
