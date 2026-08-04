import Link from "next/link";
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

const liveStudyHrefs = new Set(["/study/visuals", "/study/vocab"]);

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
            {section.features.map((feature) => {
              const isLive = liveStudyHrefs.has(feature.href);

              return (
                <li key={feature.href}>
                  {isLive ? (
                    <Link
                      href={feature.href}
                      className="flex h-full flex-col rounded-3xl bg-white p-5 shadow-soft transition-[transform,box-shadow] duration-150 hover:-translate-y-0.5 hover:shadow-soft-lg"
                    >
                      <div className="mb-3 flex items-start justify-between gap-3">
                        <h3 className="text-base font-semibold text-ink">
                          {feature.title}
                        </h3>
                        <span className="rounded-full bg-deca-green/10 px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide text-deca-green">
                          Live
                        </span>
                      </div>
                      <p className="flex-1 text-sm leading-relaxed text-muted">
                        {feature.description}
                      </p>
                      <span className="mt-4 inline-flex min-h-10 items-center text-sm font-medium text-deca-green">
                        Open →
                      </span>
                    </Link>
                  ) : (
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
                  )}
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}

const liveQuickLinks = new Set(["/study/visuals", "/study/vocab"]);

export function DashboardQuickLinks() {
  const quickLinks = [
    { label: "Start a test", href: "/tests" },
    { label: "Browse roleplays", href: "/roleplays" },
    { label: "Study PIs", href: "/study/pis" },
    { label: "Vocab flashcards", href: "/study/vocab" },
    { label: "Visual library", href: "/study/visuals" },
    { label: "View leaderboard", href: "/leaderboard" },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {quickLinks.map((link) =>
        liveQuickLinks.has(link.href) ? (
          <Link
            key={link.href}
            href={link.href}
            className="inline-flex min-h-10 items-center rounded-2xl bg-white px-4 text-sm font-medium text-deca-green shadow-soft transition-[transform,color] duration-150 hover:text-deca-green-dark active:scale-[0.96]"
          >
            {link.label}
          </Link>
        ) : (
          <span
            key={link.href}
            className="inline-flex min-h-10 cursor-not-allowed items-center rounded-2xl bg-white px-4 text-sm font-medium text-muted shadow-soft"
            title="Coming soon"
          >
            {link.label}
          </span>
        ),
      )}
    </div>
  );
}
