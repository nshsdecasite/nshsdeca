import type { Metadata } from "next";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { TestModeCard } from "@/components/test/TestModeCard";
import { requireAuth } from "@/lib/auth/roles";
import { isAssignedExamLocked } from "@/lib/test/assigned-exam-lock";

export const metadata: Metadata = {
  title: "Practice tests",
};

export default async function TestsPage() {
  await requireAuth("/tests");
  const windowOpen = await isAssignedExamLocked();

  return (
    <SocialPage size="wide">
      <PageHeader
        backHref="/study"
        backLabel="Study"
        title="Practice exams"
        description="Full cluster exams, custom quizzes, and drills built from the indicators you keep missing."
      />
      {windowOpen ? (
        <p className="mb-8 max-w-2xl text-sm leading-6 text-ink-2">
          Until 4:00 p.m. Central on Monday, only your assigned exam is open, and it runs in timed
          mode. When the 90 minutes are up the clock turns red and you can keep working. Submitting
          that exam unlocks every other test.
        </p>
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <TestModeCard
          title="Full practice test"
          description="Pick any official cluster exam and work through all 100 multiple-choice questions with rationales after you submit."
          href="/tests/full"
          badge={windowOpen ? "Assigned · Timed" : undefined}
        />
        <TestModeCard
          title="Custom test"
          description="Choose question count and filter by cluster, instructional area, or specific Performance Indicators."
          href="/tests/custom"
          locked={windowOpen}
        />
        <TestModeCard
          title="PI-targeted test"
          description="Auto-generate a quiz focused on your weakest Performance Indicators."
          href="/tests/pi-targeted"
          locked={windowOpen}
        />
        <TestModeCard
          title="Test history"
          description="Review scores, answers, and rationales from your past practice sessions."
          href="/tests/history"
        />
      </div>
    </SocialPage>
  );
}
