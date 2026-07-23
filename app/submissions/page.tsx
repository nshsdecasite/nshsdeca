import type { Metadata } from "next";
import Link from "next/link";
import { listSubmissions } from "@/app/roleplay/actions";
import { StudentHistoryList } from "@/components/roleplay/StudentHistoryList";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "My submissions",
};

export default async function SubmissionsPage() {
  await requireAuth("/submissions");
  const submissions = await listSubmissions();

  return (
    <div className="mx-auto max-w-4xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="flex items-center justify-between gap-4 mb-8">
        <div>
          <h1 className="text-3xl font-bold text-ink">My submissions</h1>
          <p className="text-muted mt-2">
            Track your roleplay attempts, scores, and officer feedback.
          </p>
        </div>
        <Link
          href="/roleplays/submit"
          className="bg-deca-green text-white text-sm font-medium px-4 py-2 rounded-2xl hover:bg-deca-green-dark transition-colors"
        >
          New submission
        </Link>
      </div>
      <StudentHistoryList submissions={submissions} />
    </div>
  );
}
