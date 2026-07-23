import type { Metadata } from "next";
import { listSubmissions } from "@/app/roleplay/actions";
import { OfficerQueueList } from "@/components/roleplay/OfficerQueueList";
import { requireRole } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Grade submissions",
};

export default async function OfficerGradingPage() {
  await requireRole(["officer", "advisor"], "/admin/grading");
  const submissions = await listSubmissions();

  return (
    <div className="mx-auto max-w-5xl px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-ink">Grading queue</h1>
        <p className="text-muted mt-2">
          Review and grade student roleplay submissions.
        </p>
      </div>
      <OfficerQueueList submissions={submissions} />
    </div>
  );
}
