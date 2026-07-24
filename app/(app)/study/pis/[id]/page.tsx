import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getPerformanceIndicator } from "@/app/study/actions";
import { SocialPage, SocialPanel } from "@/components/layout/social-ui";
import { PageHeader } from "@/components/page-header";
import { requireAuth } from "@/lib/auth/roles";

export const metadata: Metadata = {
  title: "Performance indicator",
};

type PiDetailPageProps = {
  params: Promise<{ id: string }>;
};

export default async function PiDetailPage({ params }: PiDetailPageProps) {
  const { id } = await params;
  await requireAuth(`/study/pis/${id}`);
  const pi = await getPerformanceIndicator(id);

  if (!pi) {
    notFound();
  }

  return (
    <SocialPage>
      <PageHeader
        backHref="/study/pis"
        backLabel="PI browser"
        eyebrow={pi.pi_code}
        title={pi.indicator_text}
        description={
          [
            pi.instructional_area_code
              ? `IA: ${pi.instructional_area_code}${pi.instructional_area_name ? ` — ${pi.instructional_area_name}` : ""}`
              : null,
            pi.cluster_name,
          ]
            .filter(Boolean)
            .join(" · ") || undefined
        }
      />

      <div className="mb-8 flex flex-wrap gap-3">
        <SocialPanel className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Test questions
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {pi.question_count}
          </p>
        </SocialPanel>
        <SocialPanel className="px-4 py-3">
          <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
            Roleplay events
          </p>
          <p className="mt-1 text-2xl font-bold tabular-nums text-foreground">
            {pi.roleplay_count}
          </p>
        </SocialPanel>
      </div>

      <div className="space-y-6">
        <SocialPanel className="p-6 sm:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
            Roleplay events using this PI
          </h2>
          {pi.roleplay_contexts.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No roleplay rubrics are linked to this PI yet.
            </p>
          ) : (
            <ul className="mt-5 space-y-3">
              {pi.roleplay_contexts.map((context) => (
                <li key={`${context.event_code}-${context.year}`}>
                  <Link
                    href={`/roleplays?event=${context.event_code}&year=${context.year}`}
                    className="flex flex-col gap-1 rounded-2xl border border-border/60 bg-muted px-4 py-3 transition-[border-color,transform] duration-150 hover:border-primary/30 hover:bg-primary/10 active:scale-[0.99] sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div>
                      <p className="text-sm font-semibold text-foreground">
                        {context.event_code} · {context.year}
                      </p>
                      <p className="text-sm text-muted-foreground">{context.event_name}</p>
                    </div>
                    <span className="text-xs font-medium text-primary">
                      {context.scenario_count} scenario
                      {context.scenario_count === 1 ? "" : "s"} →
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </SocialPanel>

        <SocialPanel className="p-6 sm:p-8">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-primary">
            Test questions tagged with this PI
          </h2>
          {pi.questions.length === 0 ? (
            <p className="mt-3 text-sm text-muted-foreground">
              No exam questions are tagged with this PI yet.
            </p>
          ) : (
            <>
              <p className="mt-2 text-sm text-muted-foreground">
                Showing up to 30 linked questions from released cluster exams.
              </p>
              <ul className="mt-5 space-y-4">
                {pi.questions.map((question) => (
                  <li
                    key={question.id}
                    className="rounded-2xl border border-border/60 bg-muted px-4 py-4"
                  >
                    <div className="mb-2 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                      {question.exam_code ? (
                        <span className="rounded-full bg-card px-2.5 py-1 font-semibold text-primary shadow-border">
                          {question.exam_code}
                        </span>
                      ) : null}
                      {question.exam_year ? (
                        <span className="tabular-nums">{question.exam_year}</span>
                      ) : null}
                      {question.cluster_name ? <span>{question.cluster_name}</span> : null}
                      {question.display_order ? (
                        <span className="tabular-nums">Q{question.display_order}</span>
                      ) : null}
                    </div>
                    <p className="text-sm leading-relaxed text-foreground">
                      {question.question_text}
                    </p>
                  </li>
                ))}
              </ul>
            </>
          )}
        </SocialPanel>
      </div>
    </SocialPage>
  );
}
