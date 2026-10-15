import type { Metadata } from "next";
import { VocabFlashcards } from "@/components/vocab-flashcards";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { getVocabFlashcards } from "@/lib/content/vocab";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Vocab Flashcards",
};

export default async function VocabPage() {
  await requireAuth("/study/vocab");
  const { setTitle, cards, clusters } = await getVocabFlashcards();

  return (
    <SocialPage>
      <PageHeader
        backHref="/study/misc"
        backLabel="Study tools"
        eyebrow="Study tools"
        title="Vocab flashcards"
      />
      <VocabFlashcards setTitle={setTitle} cards={cards} clusters={clusters} />
    </SocialPage>
  );
}
