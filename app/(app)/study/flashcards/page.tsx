import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listFlashcardSets } from "@/app/platform/actions";
import { SocialPage, SocialPanel } from "@/components/layout/social-ui";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "PI flashcards",
};

export default async function FlashcardsPage() {
  await requireAuth("/study/flashcards");

  return (
    <SocialPage>
      <Suspense fallback={<FlashcardSkeleton />}>
        <FlashcardList />
      </Suspense>
    </SocialPage>
  );
}

async function FlashcardList() {
  const sets = await listFlashcardSets();

  if (sets.length === 0) {
    return (
        <SocialPanel className="p-8 text-center">
          <p className="text-muted-foreground">
            No PI flashcards for your event yet. Set your competitive event on{" "}
            <Link
              href="/profile"
              className="font-semibold text-primary underline-offset-4 hover:underline"
            >
              Profile
            </Link>{" "}
            to see matching sets.
          </p>
        </SocialPanel>
    );
  }

  return (
        <ul className="grid gap-4 sm:grid-cols-2">
          {sets.map((set) => (
            <li key={set.id}>
              <Link
                href={`/study/flashcards/${set.id}`}
                className="flex h-full flex-col rounded-2xl bg-card p-5 shadow-border transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-border-hover"
              >
                <p className="text-xs font-semibold uppercase tracking-wide text-primary">
                  {set.instructional_area_code ?? "PI set"}
                </p>
                <h2 className="mt-2 text-base font-semibold text-foreground">{set.title}</h2>
                <p className="mt-3 text-sm text-muted-foreground tabular-nums">
                  {set.known_count}/{set.card_count} known
                </p>
              </Link>
            </li>
          ))}
        </ul>
  );
}

function FlashcardSkeleton() {
  return (
    <ul className="grid gap-4 sm:grid-cols-2">
      {Array.from({ length: 4 }, (_, index) => (
        <li key={index}>
          <Skeleton className="h-28 w-full" />
        </li>
      ))}
    </ul>
  );
}
