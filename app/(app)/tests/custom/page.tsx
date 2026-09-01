import type { Metadata } from "next";
import { getPiFilterOptions, listPerformanceIndicators } from "@/app/study/actions";
import { CustomTestForm } from "@/components/test/CustomTestForm";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Custom test",
};

export default async function CustomTestPage() {
  await requireAuth("/tests/custom");
  const [filters, performanceIndicators] = await Promise.all([
    getPiFilterOptions(),
    listPerformanceIndicators({ limit: 400 }),
  ]);

  return (
    <SocialPage>
      <PageHeader
        backHref="/tests"
        backLabel="Practice tests"
        eyebrow="Custom test"
        title="Build your own quiz"
        description="Pick a question count and filter by cluster, instructional area, or a specific PI. Questions are pulled randomly from the tagged exam bank."
      />
      <CustomTestForm
        clusters={filters.clusters}
        instructionalAreas={filters.instructional_areas}
        performanceIndicators={performanceIndicators.filter((pi) => pi.question_count > 0)}
      />
    </SocialPage>
  );
}
