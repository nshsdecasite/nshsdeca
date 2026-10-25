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
      />
      <TheoryLibrary
        theories={theories}
        categories={categories}
        clusters={clusters}
      />
    </SocialPage>
  );
}
