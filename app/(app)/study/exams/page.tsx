import type { Metadata } from "next";
import { TestModeCard } from "@/components/test/TestModeCard";
import { requireAuth } from "@/lib/auth/roles";
import { isAssignedExamLocked } from "@/lib/test/assigned-exam-lock";

export const metadata: Metadata = {
  title: "Exams",
};

export default async function StudyExamsPage() {
  await requireAuth("/study/exams");
  const windowOpen = await isAssignedExamLocked();

  return (
    <div>
      <h1 className="font-display text-[40px] font-black tracking-[-0.04em] text-balance">
        Exams
      </h1>
      {windowOpen ? (
        <p className="mt-3 max-w-2xl text-sm leading-6 text-ink-2">
          Until 4:00 p.m. Central on Monday, only your assigned exam is open, and it runs in timed mode.
          When the 90 minutes are up the clock turns red and you can keep working. Submitting that
          exam unlocks every other test.
        </p>
      ) : null}
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <TestModeCard
          title="Full practice test"
          href="/tests/full"
          badge={windowOpen ? "Assigned · Timed" : undefined}
        />
        <TestModeCard title="Custom test" href="/tests/custom" locked={windowOpen} />
        <TestModeCard title="PI-targeted test" href="/tests/pi-targeted" locked={windowOpen} />
        <TestModeCard title="Test history" href="/tests/history" />
      </div>
    </div>
  );
}
