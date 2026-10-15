import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { listSubmissions } from "@/app/roleplay/actions";
import { StudentHistoryList } from "@/components/roleplay/StudentHistoryList";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "My submissions",
};

export default async function SubmissionsPage() {
  await requireAuth("/submissions");

  return (
    <SocialPage>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <PageHeader
          eyebrow="Submissions"
          title="My submissions"
          className="mb-0"
        />
        <Button asChild>
          <Link href="/roleplays/submit">New submission</Link>
        </Button>
      </div>
      <div className="mt-8">
        <Suspense
          fallback={
            <div className="space-y-3">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          }
        >
          <SubmissionList />
        </Suspense>
      </div>
    </SocialPage>
  );
}

async function SubmissionList() {
  const submissions = await listSubmissions();
  return <StudentHistoryList submissions={submissions} />;
}
