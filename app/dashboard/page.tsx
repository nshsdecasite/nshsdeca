import type { Metadata } from "next";
import {
  DashboardQuickLinks,
  PlatformFeatureGrid,
} from "@/components/platform-feature-grid";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = {
  title: "Dashboard",
};

export default async function DashboardPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const firstName =
    (user?.user_metadata?.first_name as string | undefined) ?? "Member";
  const lastName = (user?.user_metadata?.last_name as string | undefined) ?? "";
  const gradeLevel = user?.user_metadata?.grade_level as number | undefined;

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 sm:py-14">
      <section className="rounded-3xl bg-gradient-to-br from-deca-green to-deca-green-dark p-8 text-white shadow-soft-lg sm:p-10">
        <p className="text-sm font-semibold uppercase tracking-wide text-green-100">
          Your dashboard
        </p>
        <h1 className="mt-2 text-3xl font-bold sm:text-4xl">
          Welcome back, {firstName}
          {lastName ? ` ${lastName.charAt(0)}.` : ""}
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-green-100 sm:text-base">
          {gradeLevel
            ? `Grade ${gradeLevel} · `
            : ""}
          Pick a tool below to start practicing. Features are listed from the
          platform blueprint — most pages are placeholders for now.
        </p>
        <div className="mt-8">
          <DashboardQuickLinks />
        </div>
      </section>

      <div className="mt-14">
        <div className="mb-10 max-w-2xl">
          <h2 className="text-2xl font-bold text-ink">What you can do here</h2>
          <p className="mt-2 text-muted">
            Everything planned for the Newman Smith DECA training platform,
            organized the same way as the product blueprint.
          </p>
        </div>
        <PlatformFeatureGrid />
      </div>
    </div>
  );
}
