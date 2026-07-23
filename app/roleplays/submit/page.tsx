import type { Metadata } from "next";
import Link from "next/link";
import { SubmitRoleplayForm } from "@/components/roleplay/SubmitRoleplayForm";
import { requireRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Submit roleplay",
};

export default async function SubmitRoleplayPage() {
  await requireRole(["student"], "/roleplays/submit");

  return (
    <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <Link href="/submissions" className="text-sm text-deca-green hover:underline">
          ← My submissions
        </Link>
        <h1 className="text-3xl font-bold text-ink mt-2">Submit roleplay</h1>
        <p className="text-muted mt-2">
          Select a scenario and submit your roleplay video for officer grading.
        </p>
      </div>
      <SubmitRoleplayForm />
    </div>
  );
}
