import {
  clusterLabels,
  clusterOrder,
  getClustersForTerm,
  type ClusterSlug,
} from "@/data/vocab-clusters";
import { vocabTerms } from "@/data/vocab-terms";

export type VocabFlashcard = {
  id: string;
  term: string;
  definition: string;
  exampleUsage: string | null;
  clusterSlugs: ClusterSlug[];
  clusterLabels: string[];
};

const VOCAB_SET_TITLE = "DECA Business Vocabulary";

function clusterOptionsFor(cards: VocabFlashcard[]) {
  const usedClusterSlugs = new Set<ClusterSlug>();
  for (const card of cards) {
    for (const slug of card.clusterSlugs) {
      usedClusterSlugs.add(slug);
    }
  }

  return clusterOrder
    .filter((slug) => usedClusterSlugs.has(slug))
    .map((slug) => ({
      slug,
      label: clusterLabels[slug],
    }));
}

function cardsFromLocalTerms(): VocabFlashcard[] {
  return vocabTerms.map((term, index) => {
    const clusterSlugs = getClustersForTerm(
      term.instructionalAreaCode,
      term.clusterSlugs,
    );
    const example = term.example?.trim() || null;

    return {
      id: `local-vocab-${index}`,
      term: term.term,
      definition: term.definition,
      exampleUsage: example,
      clusterSlugs,
      clusterLabels: clusterSlugs.map((slug) => clusterLabels[slug]),
    };
  });
}

export function getVocabFlashcards(): {
  setTitle: string;
  cards: VocabFlashcard[];
  clusters: { slug: ClusterSlug; label: string }[];
} {
  const cards = cardsFromLocalTerms();
  return {
    setTitle: VOCAB_SET_TITLE,
    cards,
    clusters: clusterOptionsFor(cards),
  };
}
