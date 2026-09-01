import type { Metadata } from "next";
import Link from "next/link";
import { listTestSessions } from "@/app/test/actions";
import { SocialPage, SocialPanel } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Test history",
};

function formatDate(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(value));
}

export default async function TestHistoryPage() {
  await requireAuth("/tests/history");
  const sessions = await listTestSessions();

  return (
    <SocialPage>
      <PageHeader
        backHref="/tests"
        backLabel="Practice tests"
        eyebrow="History"
        title="Your test history"
        description="Reopen any completed session to review answers and rationales."
      />

      {sessions.length === 0 ? (
        <SocialPanel className="p-8 text-center">
          <p className="text-muted-foreground">You haven&apos;t taken a practice test yet.</p>
          <Button asChild className="mt-4">
            <Link href="/tests/full">Start a full test</Link>
          </Button>
        </SocialPanel>
      ) : (
        <ul className="space-y-4">
          {sessions.map((session) => {
            const completed = Boolean(session.completed_at);
            return (
              <li key={session.id}>
                <Link
                  href={`/tests/${session.id}`}
                  className="flex flex-col gap-3 rounded-xl bg-card p-4 shadow-border transition-[box-shadow,transform] duration-150 ease-out hover:shadow-border-hover active:scale-[0.96] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="eyebrow">
                      {session.cluster_name ?? "Practice test"}
                    </p>
                    <h2 className="mt-1 text-base font-semibold text-foreground">
                      {session.exam_title ?? "Custom session"}
                    </h2>
                    <p className="mt-1 text-sm text-muted-foreground">
                      {session.exam_code ?? session.session_type} · Started{" "}
                      {formatDate(session.started_at)}
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    {completed ? (
                      <span className="rounded-full bg-primary/10 px-3 py-1 text-sm font-semibold tabular-nums text-primary">
                        {session.score ?? 0}/{session.total_questions}
                      </span>
                    ) : (
                      <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-semibold text-amber-800">
                        In progress
                      </span>
                    )}
                    <span className="text-sm font-medium text-primary">
                      Open
                    </span>
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </SocialPage>
  );
}
