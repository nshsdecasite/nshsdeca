import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getTestSession } from "@/app/test/actions";
import { TestTaker } from "@/components/test/TestTaker";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Practice test",
};

type TestSessionPageProps = {
  params: Promise<{ sessionId: string }>;
};

export default async function TestSessionPage({ params }: TestSessionPageProps) {
  const { sessionId } = await params;
  await requireAuth(`/tests/${sessionId}`);
  const session = await getTestSession(sessionId);

  if (!session) {
    notFound();
  }

  return <TestTaker session={session} />;
}
