import type { Metadata } from "next";
import { getPiFilterOptions } from "@/app/study/actions";
import { CustomTestForm } from "@/components/test/CustomTestForm";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth/roles";
import { isAssignedExamLocked } from "@/lib/test/assigned-exam-lock";

export const metadata: Metadata = {
  title: "Custom test",
};

export default async function CustomTestPage() {
  await requireAuth("/tests/custom");
  if (await isAssignedExamLocked()) {
    return (
      <SocialPage>
        <PageHeader
          backHref="/tests"
          backLabel="Practice tests"
          eyebrow="Custom test"
          title="Build your own quiz"
        />
        <p className="max-w-2xl text-sm leading-6 text-ink-2">
          Custom tests stay locked until you submit your assigned exam, or until 4:00 p.m. Central on Monday.
        </p>
      </SocialPage>
    );
  }
  const filters = await getPiFilterOptions();

  return (
    <SocialPage>
      <PageHeader
        backHref="/tests"
        backLabel="Practice tests"
        eyebrow="Custom test"
        title="Build your own quiz"
      />
      <CustomTestForm
        clusters={filters.clusters}
        instructionalAreas={filters.instructional_areas}
      />
    </SocialPage>
  );
}
