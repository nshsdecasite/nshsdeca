import type { Metadata } from "next";
import Link from "next/link";
import { listExams } from "@/app/test/actions";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { ExamPicker } from "@/components/test/ExamPicker";
import { requireAuth } from "@/lib/auth/roles";
import { loadMyProfile } from "@/lib/data/request-cache";

export const metadata: Metadata = {
  title: "Full practice test",
};

type FullTestPageProps = {
  searchParams: Promise<{ all?: string }>;
};

export default async function FullTestPage({ searchParams }: FullTestPageProps) {
  await requireAuth("/tests/full");
  const [params, profile, exams] = await Promise.all([
    searchParams,
    loadMyProfile(),
    listExams(),
  ]);
  const showAll = params.all === "1" || !profile?.cluster_slug;
  const visible = showAll
    ? exams
    : exams.filter((exam) => exam.cluster_slug === profile.cluster_slug);
  const eventLabel = profile?.event_code
    ? `${profile.event_code}${profile.cluster_name ? ` · ${profile.cluster_name}` : ""}`
    : null;

  return (
    <SocialPage size="wide">
      <PageHeader
        backHref="/tests"
        backLabel="Practice tests"
        eyebrow="Full test"
        title={eventLabel ? `${eventLabel} exam` : "Pick an official cluster exam"}
        description={
          showAll
            ? "Each exam includes 100 multiple-choice questions from a released DECA cluster sample test. Timed mode is 90 minutes."
            : `These are the ${profile?.cluster_name ?? "cluster"} exams for ${profile?.event_code}. The newest year is first. Each one has 100 questions. Timed mode is 90 minutes.`
        }
      />
      {!showAll ? (
        <p className="mb-6 text-sm text-muted-foreground">
          <Link href="/tests/full?all=1" className="font-semibold text-foreground">
            Show every cluster exam
          </Link>
        </p>
      ) : profile?.cluster_slug ? (
        <p className="mb-6 text-sm text-muted-foreground">
          <Link href="/tests/full" className="font-semibold text-foreground">
            Show only your {profile.event_code} exam
          </Link>
        </p>
      ) : null}
      <ExamPicker exams={visible} />
    </SocialPage>
  );
}
