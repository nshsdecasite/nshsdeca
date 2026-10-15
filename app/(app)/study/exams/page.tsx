import type { Metadata } from "next";
import { TestModeCard } from "@/components/test/TestModeCard";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Exams",
};

export default async function StudyExamsPage() {
  await requireAuth("/study/exams");

  return (
    <div>
      <h1 className="font-display text-[40px] font-black tracking-[-0.04em] text-balance">
        Exams
      </h1>
      <div className="mt-8 grid gap-4 sm:grid-cols-2">
        <TestModeCard title="Full practice test" href="/tests/full" />
        <TestModeCard title="Custom test" href="/tests/custom" />
        <TestModeCard title="PI-targeted test" href="/tests/pi-targeted" />
        <TestModeCard title="Test history" href="/tests/history" />
      </div>
    </div>
  );
}
