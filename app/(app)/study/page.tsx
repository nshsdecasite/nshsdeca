import type { Metadata } from "next";
import { StudyHubScreen } from "@/components/deca/study-hub-screen";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Study",
};

export default async function StudyPage() {
  await requireAuth("/study");
  return <StudyHubScreen />;
}
