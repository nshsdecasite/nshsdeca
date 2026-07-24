import type { Metadata } from "next";
import Link from "next/link";
import { listSubmissions } from "@/app/roleplay/actions";
import { StudentHistoryList } from "@/components/roleplay/StudentHistoryList";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "My submissions",
};

export default async function SubmissionsPage() {
  await requireAuth("/submissions");
  const submissions = await listSubmissions();

  return (
    <SocialPage>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Submissions"
          title="My submissions"
          description="Track your roleplay attempts, scores, and officer feedback."
          className="mb-0"
        />
        <Button asChild>
          <Link href="/roleplays/submit">New submission</Link>
        </Button>
      </div>
      <div className="mt-8">
        <StudentHistoryList submissions={submissions} />
      </div>
    </SocialPage>
  );
}
