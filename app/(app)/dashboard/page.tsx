import type { Metadata } from "next";
import Link from "next/link";
import { listAnnouncements } from "@/app/admin/actions";
import { getDashboardStats, getMyProfile } from "@/app/platform/actions";
import { DashboardQuickLinks } from "@/components/platform-feature-grid";
import { SocialPage, SocialPanel } from "@/components/layout/social-ui";
import { displayName, requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  await requireAuth("/dashboard");
  const [profile, stats, announcements] = await Promise.all([
    getMyProfile(),
    getDashboardStats(),
    listAnnouncements(),
  ]);

  const name = displayName(profile?.first_name, profile?.last_name, profile?.email);

  return (
    <SocialPage size="wide">
      <section className="rounded-3xl bg-gradient-to-br from-deca-green to-deca-green-dark p-8 text-white shadow-border-hover sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-100">
          Your dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">Welcome back, {name}</h1>
        <p className="mt-3 max-w-2xl text-sm text-green-100 sm:text-base">
          {profile?.grade_level ? `Grade ${profile.grade_level} · ` : ""}
          {stats.total_points} points · {stats.tests_completed} tests completed ·{" "}
          {stats.roleplays_submitted} roleplays submitted
        </p>
        <div className="mt-8">
          <DashboardQuickLinks />
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-3">
        <SocialPanel className="lg:col-span-2">
          <h2 className="text-lg font-semibold text-foreground">Recent tests</h2>
          {stats.recent_sessions?.length ? (
            <ul className="mt-4 space-y-3">
              {stats.recent_sessions.map((session) => (
                <li key={session.id}>
                  <Link
                    href={`/tests/${session.id}`}
                    className="flex items-center justify-between rounded-2xl bg-muted px-4 py-3 transition-colors hover:bg-primary/10"
                  >
                    <div>
                      <p className="text-sm font-medium text-foreground">
                        {session.title ?? session.session_type}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {session.completed_at ? "Completed" : "In progress"}
                      </p>
                    </div>
                    {session.completed_at ? (
                      <span className="text-sm font-semibold tabular-nums text-primary">
                        {session.score ?? 0}/{session.total_questions}
                      </span>
                    ) : (
                      <span className="text-sm text-amber-700">Resume →</span>
                    )}
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">No tests yet. Start with a full practice exam.</p>
          )}
        </SocialPanel>

        <SocialPanel>
          <h2 className="text-lg font-semibold text-foreground">Weak PIs</h2>
          {stats.weak_pis?.length ? (
            <ul className="mt-4 space-y-3">
              {stats.weak_pis.map((pi) => (
                <li key={pi.id}>
                  <Link
                    href={`/study/pis/${pi.id}`}
                    className="block rounded-2xl bg-muted px-4 py-3 transition-colors hover:bg-primary/10"
                  >
                    <p className="text-xs font-semibold text-primary">{pi.pi_code}</p>
                    <p className="mt-1 text-sm text-foreground line-clamp-2">{pi.indicator_text}</p>
                    <p className="mt-1 text-xs text-muted-foreground tabular-nums">
                      {pi.accuracy}% accuracy · {pi.total_attempts} attempts
                    </p>
                  </Link>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-4 text-sm text-muted-foreground">
              Answer more test questions to unlock PI weakness tracking.
            </p>
          )}
          <Link
            href="/tests/pi-targeted"
            className="mt-4 inline-flex text-sm font-medium text-primary hover:text-primary"
          >
            Practice weak PIs →
          </Link>
        </SocialPanel>
      </div>

      {announcements.length > 0 ? (
        <SocialPanel className="mt-8">
          <h2 className="text-lg font-semibold text-foreground">Chapter announcements</h2>
          <ul className="mt-4 space-y-3">
            {announcements.slice(0, 3).map((announcement) => (
              <li
                key={announcement.id}
                className="rounded-2xl border border-border/60 bg-muted px-4 py-3"
              >
                <p className="text-sm leading-relaxed text-foreground">{announcement.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {announcement.author_name || "Officer"} ·{" "}
                  {new Date(announcement.created_at).toLocaleDateString()}
                </p>
              </li>
            ))}
          </ul>
        </SocialPanel>
      ) : null}
    </SocialPage>
  );
}
