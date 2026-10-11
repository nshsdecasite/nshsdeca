import type { Metadata } from "next";
import { GenerateScreen } from "@/components/deca/generate-screen";
import { requireAuth } from "@/lib/auth/roles";
import { listGeneratorEvents } from "@/lib/roleplay-gen/select";

export const metadata: Metadata = {
  title: "Generate a practice event",
};

export const maxDuration = 60;

export default async function GeneratePage() {
  await requireAuth("/generate");
  const events = listGeneratorEvents();
  return <GenerateScreen events={events} />;
}
