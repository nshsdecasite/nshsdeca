import { platformSections } from "@/data/platform-features";

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

export function PlatformFeatureGrid() {
  return (
    <div className="flex flex-col gap-14">
      {platformSections.map((section) => (
        <section key={section.title}>
          <div className="mb-6 max-w-2xl">
            <h2 className="text-2xl font-bold text-ink">{section.title}</h2>
            <p className="mt-2 text-sm text-muted">{section.description}</p>
          </div>

          <ul className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {section.features.map((feature) => (
              <li key={feature.href}>
                <div className="flex h-full flex-col rounded-3xl bg-white p-5 shadow-soft">
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <h3 className="text-base font-semibold text-ink">
                      {feature.title}
                    </h3>
                    <FeatureBadge badge={feature.badge} />
                  </div>
                  <p className="flex-1 text-sm leading-relaxed text-muted">
                    {feature.description}
                  </p>
                  <span className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-deca-green/50">
                    {feature.href}
                  </span>
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}

export function DashboardQuickLinks() {
  const quickLinks = [
    { label: "Start a test", href: "/tests" },
    { label: "Browse roleplays", href: "/roleplays" },
    { label: "Study PIs", href: "/study/pis" },
    { label: "View leaderboard", href: "/leaderboard" },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {quickLinks.map((link) => (
        <span
          key={link.href}
          className="inline-flex min-h-10 cursor-not-allowed items-center rounded-2xl bg-white px-4 text-sm font-medium text-muted shadow-soft"
          title="Coming soon"
        >
          {link.label}
        </span>
      ))}
    </div>
  );
}
