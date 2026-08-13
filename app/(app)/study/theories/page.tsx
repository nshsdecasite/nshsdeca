import type { Metadata } from "next";
import { TheoryLibrary } from "@/components/theory-library";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { getTheories } from "@/lib/content/theories";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Theories & Fallacies",
};

export default async function TheoriesPage() {
  await requireAuth("/study/theories");
  const { theories, categories, clusters } = await getTheories();

  return (
    <SocialPage size="wide">
      <PageHeader
        backHref="/study"
        backLabel="Study tools"
        eyebrow="Study tools"
        title="Theories & fallacies"
        description="Motivational frameworks, psychological principles, and logical fallacies organized by DECA cluster. Click any card to read the full explanation and example scenario."
      />
      <TheoryLibrary
        theories={theories}
        categories={categories}
        clusters={clusters}
      />
    </SocialPage>
  );
}
