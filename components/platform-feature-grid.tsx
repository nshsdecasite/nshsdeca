import Link from "next/link";
import { platformSections } from "@/data/platform-features";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function FeatureBadge({
  isLive,
  badge,
}: {
  isLive: boolean;
  badge?: "coming-soon" | "officer";
}) {
  if (isLive && badge === "officer") return <Badge variant="warning">Officers</Badge>;
  if (isLive) return null;
  return <Badge variant="muted">Coming soon</Badge>;
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
  "/study/vocab",
  "/study/visuals",
  "/study/theories",
  "/notes",
  "/dashboard",
  "/leaderboard",
  "/profile",
  "/messages",
]);

export async function PlatformFeatureGrid() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const role = user ? await getUserRole(user.id) : null;

  return (
    <div className="flex flex-col gap-10">
      {platformSections.map((section) => (
        <section key={section.title}>
          <h2 className="text-lg font-semibold tracking-tight">{section.title}</h2>
          <p className="mt-1 text-sm text-muted-foreground">{section.description}</p>
          <ul className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
            {section.features.map((feature) => {
              const isLive = LIVE_ROUTES.has(feature.href);
              const isOfficerOnly = feature.badge === "officer";
              const canAccess =
                isLive && (!isOfficerOnly || role === "officer" || role === "advisor");

              return (
                <li key={feature.href}>
                  <Card className="flex h-full flex-col p-5">
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <h3 className="text-[15px] font-semibold tracking-tight">{feature.title}</h3>
                      <FeatureBadge isLive={isLive} badge={feature.badge} />
                    </div>
                    <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
                      {feature.description}
                    </p>
                    {canAccess ? (
                      <Link
                        href={feature.href}
                        className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-primary"
                      >
                        Open
                      </Link>
                    ) : (
                      <span className="mt-4 inline-flex min-h-10 items-center text-sm text-muted-foreground">
                        Coming soon
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
  return null;
}
