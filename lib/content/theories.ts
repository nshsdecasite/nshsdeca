import {
  clusterLabels,
  clusterOrder,
  type ClusterSlug,
} from "@/data/vocab-clusters";
import {
  theoryCategoryLabels,
  type TheoryCategory,
} from "@/data/theories";
import { createAdminClient } from "@/lib/supabase/admin";

export type Theory = {
  id: string;
  theoryName: string;
  category: TheoryCategory;
  categoryLabel: string;
  explanation: string;
  exampleScenario: string;
  clusterSlug: ClusterSlug;
  clusterLabel: string;
};

type TheoryRow = {
  id: string;
  theory_name: string;
  category: TheoryCategory;
  explanation: string;
  example_scenario: string;
  cluster_slug: ClusterSlug | null;
  cluster_name: string | null;
};

export async function getTheories(): Promise<{
  theories: Theory[];
  categories: { value: TheoryCategory; label: string }[];
  clusters: { slug: ClusterSlug; label: string }[];
}> {
  const supabase = createAdminClient();

  const { data, error } = await supabase.rpc("get_theories");

  if (error) {
    throw new Error(error.message);
  }

  const rows = (data ?? []) as TheoryRow[];

  const theories = rows.map((row) => {
    const clusterSlug =
      row.cluster_slug ?? "business-management-and-administration";

    return {
      id: row.id,
      theoryName: row.theory_name,
      category: row.category,
      categoryLabel: theoryCategoryLabels[row.category] ?? row.category,
      explanation: row.explanation,
      exampleScenario: row.example_scenario,
      clusterSlug,
      clusterLabel:
        row.cluster_name ?? clusterLabels[clusterSlug] ?? clusterSlug,
    };
  });

  const usedCategories = new Set<TheoryCategory>();
  const usedClusterSlugs = new Set<ClusterSlug>();

  for (const theory of theories) {
    usedCategories.add(theory.category);
    usedClusterSlugs.add(theory.clusterSlug);
  }

  const categories = (Object.keys(theoryCategoryLabels) as TheoryCategory[])
    .filter((category) => usedCategories.has(category))
    .map((category) => ({
      value: category,
      label: theoryCategoryLabels[category],
    }));

  const clusters = clusterOrder
    .filter((slug) => usedClusterSlugs.has(slug))
    .map((slug) => ({
      slug,
      label: clusterLabels[slug],
    }));

  return { theories, categories, clusters };
}
