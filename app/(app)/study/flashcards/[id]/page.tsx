import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getFlashcardSet } from "@/app/platform/actions";
import { FlashcardStudy } from "@/components/study/FlashcardStudy";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Flashcard set",
};

type FlashcardSetPageProps = {
  params: Promise<{ id: string }>;
};

export default async function FlashcardSetPage({ params }: FlashcardSetPageProps) {
  const { id } = await params;
  await requireAuth(`/study/flashcards/${id}`);
  const set = await getFlashcardSet(id);

  if (!set) {
    notFound();
  }

  return (
    <SocialPage>
      <PageHeader
        backHref="/study/flashcards"
        backLabel="PI flashcards"
        eyebrow="Study"
        title={set.title}
        description="Flip each card, then mark whether you know the PI definition."
      />
      <FlashcardStudy setId={set.id} title={set.title} cards={set.cards} />
    </SocialPage>
  );
}
