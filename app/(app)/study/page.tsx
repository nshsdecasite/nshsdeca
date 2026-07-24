import type { Metadata } from "next";
import Link from "next/link";
import { SocialPage, SocialPanel } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { platformSections } from "@/data/platform-features";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Study tools",
};

const LIVE_STUDY_ROUTES = new Set(["/study/pis", "/study/flashcards", "/notes"]);

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
        description="Browse Performance Indicators, flashcards, theories, and reference material — all connected to your practice tests and roleplays."
      />

      <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {(studySection?.features ?? []).map((feature) => {
          const isLive = LIVE_STUDY_ROUTES.has(feature.href);
          return (
            <li key={feature.href}>
              <SocialPanel className="flex h-full flex-col">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <h2 className="text-base font-semibold text-foreground">{feature.title}</h2>
                  {!isLive ? (
                    <span className="rounded-full bg-muted px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
                      Coming soon
                    </span>
                  ) : null}
                </div>
                <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                  {feature.description}
                </p>
                {isLive ? (
                  <Link
                    href={feature.href}
                    className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-primary hover:text-primary"
                  >
                    Open →
                  </Link>
                ) : (
                  <span className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-primary/50">
                    {feature.href}
                  </span>
                )}
              </SocialPanel>
            </li>
          );
        })}
      </ul>
    </SocialPage>
  );
}
