import { unstable_cache } from "next/cache";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { ExamSummary } from "@/lib/test/types";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function mapExams(rows: Record<string, unknown>[] | null): ExamSummary[] {
  return (rows ?? []).map((row) => ({
    ...(row as ExamSummary),
    question_count: Number(row.question_count ?? 0),
  }));
}

async function fetchExamCatalog(supabase: SupabaseClient): Promise<ExamSummary[]> {
  const { data, error } = await supabase.rpc("list_exams");
  if (error) throw new Error(error.message);
  return mapExams(data as Record<string, unknown>[] | null);
}

const loadCachedExamCatalog = unstable_cache(
  async () => fetchExamCatalog(createAdminClient()),
  ["exam-catalog-v1"],
  { revalidate: 60 * 60 * 6 },
);

/** Official exam list. Cached for six hours — it only changes when a new exam is loaded. */
export async function listExamCatalog(): Promise<ExamSummary[]> {
  try {
    return await loadCachedExamCatalog();
  } catch {
    return fetchExamCatalog(await createClient());
  }
}
