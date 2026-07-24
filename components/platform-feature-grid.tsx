import Link from "next/link";
import { platformSections } from "@/data/platform-features";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function FeatureBadge({ badge }: { badge?: "coming-soon" | "officer" }) {
  if (!badge) {
    return <Badge variant="muted">Coming soon</Badge>;
  }

  if (badge === "officer") {
    return <Badge variant="warning">Officers</Badge>;
  }

  return null;
}

const LIVE_ROUTES = new Set([
  "/tests",
  "/tests/full",
  "/tests/custom",
  "/tests/pi-targeted",
  "/tests/history",
  "/roleplays",
  "/roleplays/submit",
  "/submissions",
  "/admin/grading",
  "/admin",
  "/study",
  "/study/pis",
  "/study/flashcards",
  "/notes",
  "/dashboard",
  "/leaderboard",
  "/profile",
]);

export async function PlatformFeatureGrid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user ? await getUserRole(user.id) : null;

  return (
    <div className="flex flex-col gap-14">
      {platformSections.map((section) => (
        <section key={section.title}>
          <div className="mb-6 max-w-2xl">
            <h2 className="text-2xl font-bold text-foreground">{section.title}</h2>
            <p className="mt-2 text-sm text-muted-foreground">{section.description}</p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {section.features.map((feature) => {
              const isLive = LIVE_ROUTES.has(feature.href);
              const isOfficerOnly = feature.badge === "officer";
              const canAccess =
                isLive &&
                (!isOfficerOnly || role === "officer" || role === "advisor");

              return (
                <li key={feature.href}>
                  <Card className="flex h-full flex-col p-5">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-foreground">
                        {feature.title}
                      </h3>
                      <FeatureBadge badge={isLive ? undefined : feature.badge} />
                    </div>
                    <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                    {canAccess ? (
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
                  </Card>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

export async function DashboardQuickLinks() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user ? await getUserRole(user.id) : null;

  const quickLinks = [
    { label: "Start a test", href: "/tests", live: true },
    { label: "Browse roleplays", href: "/roleplays", live: true },
    { label: "Submit roleplay", href: "/roleplays/submit", live: role === "student" },
    { label: "My submissions", href: "/submissions", live: true },
    {
      label: "Grade submissions",
      href: "/admin/grading",
      live: role === "officer" || role === "advisor",
    },
    { label: "Study PIs", href: "/study/pis", live: true },
    { label: "Flashcards", href: "/study/flashcards", live: true },
    { label: "My notes", href: "/notes", live: true },
    { label: "View leaderboard", href: "/leaderboard", live: true },
    { label: "Profile", href: "/profile", live: true },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {quickLinks.map((link) =>
        link.live ? (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-10 items-center rounded-2xl bg-card px-4 text-sm font-medium text-foreground shadow-border transition-colors hover:text-primary"
          >
            {link.label}
          </Link>
        ) : (
          <span
            key={link.href}
            className="inline-flex min-h-10 cursor-not-allowed items-center rounded-2xl bg-card/70 px-4 text-sm font-medium text-muted-foreground/80 shadow-border"
            title="Coming soon"
          >
            {link.label}
          </span>
        ),
      )}
    </div>
  );
}
