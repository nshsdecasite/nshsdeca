import Link from "next/link";
import { platformSections } from "@/data/platform-features";
import { getUserRole } from "@/lib/auth/roles";
import { createClient } from "@/lib/supabase/server";

function FeatureBadge({ badge }: { badge?: "coming-soon" | "officer" }) {
  if (!badge) {
    return (
      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-muted">
        Coming soon
      </span>
    );
  }

  if (badge === "officer") {
    return (
      <span className="rounded-full bg-amber-100 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-amber-800">
        Officers
      </span>
    );
  }

  return null;
}

const LIVE_ROUTES = new Set([
  "/roleplays/submit",
  "/submissions",
  "/admin/grading",
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
            <h2 className="text-2xl font-bold text-ink">{section.title}</h2>
            <p className="mt-2 text-sm text-muted">{section.description}</p>
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
                  <div className="flex h-full flex-col rounded-3xl bg-white p-5 shadow-soft">
                    <div className="mb-3 flex items-start justify-between gap-3">
                      <h3 className="text-base font-semibold text-ink">
                        {feature.title}
                      </h3>
                      <FeatureBadge badge={isLive ? undefined : feature.badge} />
                    </div>
                    <p className="flex-1 text-sm leading-relaxed text-muted">
                      {feature.description}
                    </p>
                    {canAccess ? (
                      <Link
                        href={feature.href}
                        className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-deca-green hover:text-deca-green-dark"
                      >
                        Open →
                      </Link>
                    ) : (
                      <span className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-deca-green/50">
                        {feature.href}
                      </span>
                    )}
                  </div>
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
    { label: "Start a test", href: "/tests", live: false },
    { label: "Submit roleplay", href: "/roleplays/submit", live: role === "student" },
    { label: "My submissions", href: "/submissions", live: true },
    {
      label: "Grade submissions",
      href: "/admin/grading",
      live: role === "officer" || role === "advisor",
    },
    { label: "Study PIs", href: "/study/pis", live: false },
    { label: "View leaderboard", href: "/leaderboard", live: false },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {quickLinks.map((link) =>
        link.live ? (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-10 items-center rounded-2xl bg-white px-4 text-sm font-medium text-ink shadow-soft transition-colors hover:text-deca-green"
          >
            {link.label}
          </Link>
        ) : (
          <span
            key={link.href}
            className="inline-flex min-h-10 cursor-not-allowed items-center rounded-2xl bg-white/70 px-4 text-sm font-medium text-green-100/80 shadow-soft"
            title="Coming soon"
          >
            {link.label}
          </span>
        ),
      )}
    </div>
  );
}
