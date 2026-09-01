import type { Metadata } from "next";
import Link from "next/link";
import { SocialPage, SocialPanel } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { platformSections } from "@/data/platform-features";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Study tools",
};

const LIVE_STUDY_ROUTES = new Set([
  "/study/pis",
  "/study/flashcards",
  "/study/vocab",
  "/study/visuals",
  "/study/theories",
  "/notes",
]);

export default async function StudyPage() {
  await requireAuth("/study");
  const studySection = platformSections.find((section) => section.title === "Study tools");

  return (
    <SocialPage size="wide">
      <PageHeader
        backHref="/dashboard"
        backLabel="Dashboard"
        eyebrow="Study"
        title="Study tools"
        description="PIs, flashcards, theories, and reference material tied to your tests and roleplays."
      />

      <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {(studySection?.features ?? []).map((feature) => {
          const isLive = LIVE_STUDY_ROUTES.has(feature.href);
          const card = (
            <SocialPanel interactive={isLive} className="flex h-full flex-col">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h2 className="text-[15px] font-semibold tracking-tight">{feature.title}</h2>
                {!isLive ? <Badge variant="muted">Coming soon</Badge> : null}
              </div>
              <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                {feature.description}
              </p>
              <span className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-primary">
                {isLive ? "Open" : "Coming soon"}
              </span>
            </SocialPanel>
          );

          return (
            <li key={feature.href}>
              {isLive ? (
                <Link href={feature.href} className="block h-full">
                  {card}
                </Link>
              ) : (
                card
              )}
            </li>
          );
        })}
      </ul>
    </SocialPage>
  );
}
