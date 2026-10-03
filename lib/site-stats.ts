import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type SiteStats = {
  scenarios: number;
  examQuestions: number;
  exams: number;
  competitiveEvents: number;
  performanceIndicators: number;
};

const FALLBACK: SiteStats = {
  scenarios: 401,
  examQuestions: 6800,
  exams: 68,
  competitiveEvents: 60,
  performanceIndicators: 2691,
};

async function countTable(
  admin: ReturnType<typeof createAdminClient>,
  schema: string,
  table: string,
): Promise<number> {
  const { count, error } = await admin
    .schema(schema)
    .from(table)
    .select("*", { count: "exact", head: true });

  if (error || count == null) {
    throw error ?? new Error(`Could not count ${schema}.${table}`);
  }

  return count;
}

const loadSiteStats = unstable_cache(
  async (): Promise<SiteStats> => {
    const admin = createAdminClient();
    const [scenarios, examQuestions, exams, competitiveEvents, performanceIndicators] =
      await Promise.all([
        countTable(admin, "events", "scenarios"),
        countTable(admin, "testbank", "exam_questions"),
        countTable(admin, "testbank", "exams"),
        countTable(admin, "events", "events"),
        countTable(admin, "practice", "performance_indicators"),
      ]);

    return {
      scenarios,
      examQuestions,
      exams,
      competitiveEvents,
      performanceIndicators,
    };
  },
  ["site-stats"],
  { revalidate: 300 },
);

export async function getSiteStats(): Promise<SiteStats> {
  try {
    return await loadSiteStats();
  } catch {
    return FALLBACK;
  }
}

export function formatStat(value: number): string {
  return value.toLocaleString("en-US");
}
