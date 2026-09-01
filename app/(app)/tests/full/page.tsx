import type { Metadata } from "next";
import { listExams } from "@/app/test/actions";
import { SocialPage } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { ExamPicker } from "@/components/test/ExamPicker";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Full practice test",
};

export default async function FullTestPage() {
  await requireAuth("/tests/full");
  const exams = await listExams();

  return (
    <SocialPage size="wide">
      <PageHeader
        backHref="/tests"
        backLabel="Practice tests"
        eyebrow="Full test"
        title="Pick an official cluster exam"
        description="Each exam includes 100 multiple-choice questions from a released DECA cluster sample test. Timed mode is 90 minutes."
      />
      <ExamPicker exams={exams} />
    </SocialPage>
  );
}
