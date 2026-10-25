import type { Metadata } from "next";
import { getPiFilterOptions } from "@/app/study/actions";
import { CustomTestForm } from "@/components/test/CustomTestForm";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Custom test",
};

export default async function CustomTestPage() {
  await requireAuth("/tests/custom");
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
