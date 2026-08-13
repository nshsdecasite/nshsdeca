import type { Metadata } from "next";
import { VisualLibrary } from "@/components/visual-library";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Visual Reference Library",
};

export default async function VisualsPage() {
  await requireAuth("/study/visuals");

  return (
    <SocialPage size="wide">
      <PageHeader
        backHref="/study"
        backLabel="Study tools"
        eyebrow="Study tools"
        title="Visual reference library"
        description="Charts, matrices, and concept diagrams for roleplays and tests. Click any card to expand the full visual."
      />
      <VisualLibrary />
    </SocialPage>
  );
}
