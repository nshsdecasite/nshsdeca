import type { VocabTerm } from "@/data/vocab-terms";

export type ClusterSlug =
  | "business-management-and-administration"
  | "entrepreneurship"
  | "finance"
  | "hospitality-and-tourism"
  | "marketing"
  | "personal-financial-literacy";

export const clusterOrder: ClusterSlug[] = [
  "business-management-and-administration",
  "entrepreneurship",
  "finance",
  "marketing",
  "hospitality-and-tourism",
  "personal-financial-literacy",
];

export const clusterLabels: Record<ClusterSlug, string> = {
  "business-management-and-administration": "Business Management",
  entrepreneurship: "Entrepreneurship",
  finance: "Finance",
  marketing: "Marketing",
  "hospitality-and-tourism": "Hospitality & Tourism",
  "personal-financial-literacy": "Personal Financial Literacy",
};

export const iaToClusters: Record<
  VocabTerm["instructionalAreaCode"],
  ClusterSlug[]
> = {
  FI: ["finance", "entrepreneurship", "personal-financial-literacy"],
  EC: ["finance", "marketing", "entrepreneurship", "personal-financial-literacy"],
  MK: ["marketing"],
  DS: ["marketing"],
  OP: ["business-management-and-administration", "entrepreneurship", "hospitality-and-tourism"],
  QM: ["business-management-and-administration"],
  EN: ["entrepreneurship"],
  SM: [
    "business-management-and-administration",
    "marketing",
    "entrepreneurship",
  ],
  BL: ["business-management-and-administration", "entrepreneurship"],
  HR: ["business-management-and-administration"],
  PD: ["business-management-and-administration"],
  RM: ["finance", "business-management-and-administration"],
  PM: ["marketing"],
  CO: ["business-management-and-administration", "marketing"],
  CR: ["marketing", "hospitality-and-tourism"],
  PR: ["marketing", "entrepreneurship"],
  SE: ["marketing", "entrepreneurship"],
  UN: ["business-management-and-administration"],
};

export function getClustersForTerm(
  instructionalAreaCode: VocabTerm["instructionalAreaCode"],
  clusterSlugs?: ClusterSlug[],
): ClusterSlug[] {
  return (
    clusterSlugs ??
    iaToClusters[instructionalAreaCode] ?? [
      "business-management-and-administration",
    ]
  );
}

export function getClusterLabel(slug: ClusterSlug): string {
  return clusterLabels[slug];
}
