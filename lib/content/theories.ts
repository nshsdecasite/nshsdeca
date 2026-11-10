import {
  clusterLabels,
  clusterOrder,
  type ClusterSlug,
} from "@/data/vocab-clusters";
import {
  theories as theorySeeds,
  theoryCategoryLabels,
  type TheoryCategory,
} from "@/data/theories";

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

export function getTheories(): {
  theories: Theory[];
  categories: { value: TheoryCategory; label: string }[];
  clusters: { slug: ClusterSlug; label: string }[];
} {
  const theories = theorySeeds.map((theory, index) => ({
    id: `theory-${index}`,
    theoryName: theory.theoryName,
    category: theory.category,
    categoryLabel: theoryCategoryLabels[theory.category] ?? theory.category,
    explanation: theory.explanation,
    exampleScenario: theory.exampleScenario,
    clusterSlug: theory.clusterSlug,
    clusterLabel: clusterLabels[theory.clusterSlug],
  }));

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
