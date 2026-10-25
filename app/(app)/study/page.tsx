import type { Metadata } from "next";
import { StudyHubScreen } from "@/components/deca/study-hub-screen";
import { requireAuth } from "@/lib/auth/roles";
import { isAssignedExamLocked } from "@/lib/test/assigned-exam-lock";

export const metadata: Metadata = {
  title: "Study",
};

export default async function StudyPage() {
  await requireAuth("/study");
  const examsLocked = await isAssignedExamLocked();
  return <StudyHubScreen examsLocked={examsLocked} />;
}
