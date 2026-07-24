import type { Metadata } from "next";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { TestModeCard } from "@/components/test/TestModeCard";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Practice tests",
};

export default async function TestsPage() {
  await requireAuth("/tests");

  return (
    <SocialPage size="wide">
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        eyebrow="Practice tests"
        title="Choose how you want to practice"
        description="Take a full cluster exam, build a custom quiz, or target your weakest PIs."
      />

      <div className="grid gap-4 sm:grid-cols-2">
        <TestModeCard
          title="Full practice test"
          description="Pick any official cluster exam and work through all 100 multiple-choice questions with rationales after you submit."
          href="/tests/full"
          badge="Live"
        />
        <TestModeCard
          title="Custom test"
          description="Choose question count and filter by cluster, instructional area, or specific Performance Indicators."
          href="/tests/custom"
          badge="Live"
        />
        <TestModeCard
          title="PI-targeted test"
          description="Auto-generate a quiz focused on your weakest Performance Indicators."
          href="/tests/pi-targeted"
          badge="Live"
        />
        <TestModeCard
          title="Test history"
          description="Review scores, answers, and rationales from your past practice sessions."
          href="/tests/history"
          badge="Live"
        />
      </div>
    </SocialPage>
  );
}
