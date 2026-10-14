import {
  clusterLabels,
  clusterOrder,
  getClustersForTerm,
  type ClusterSlug,
} from "@/data/vocab-clusters";
import { vocabTerms } from "@/data/vocab-terms";
import { createAdminClient } from "@/lib/supabase/admin";

export type VocabFlashcard = {
  id: string;
  term: string;
  definition: string;
  exampleUsage: string | null;
  clusterSlugs: ClusterSlug[];
  clusterLabels: string[];
};

const VOCAB_SET_TITLE = "DECA Business Vocabulary";

const clustersByTerm = new Map(
  vocabTerms.map((term) => {
    const clusterSlugs = getClustersForTerm(
      term.instructionalAreaCode,
      term.clusterSlugs,
    );

    return [
      term.term,
      {
        clusterSlugs,
        clusterLabels: clusterSlugs.map((slug) => clusterLabels[slug]),
      },
    ];
  }),
);

type VocabFlashcardRow = {
  id: string;
  term: string;
  definition: string;
  example_usage: string | null;
  set_title: string;
};

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

function fromLocalBank() {
  const cards = cardsFromLocalTerms();
  return {
    setTitle: VOCAB_SET_TITLE,
    cards,
    clusters: clusterOptionsFor(cards),
  };
}

export async function getVocabFlashcards(): Promise<{
  setTitle: string;
  cards: VocabFlashcard[];
  clusters: { slug: ClusterSlug; label: string }[];
}> {
  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.rpc("get_vocab_flashcards");

    if (error) {
      return fromLocalBank();
    }

    const rows = (data ?? []) as VocabFlashcardRow[];

    if (rows.length === 0) {
      return fromLocalBank();
    }

    const cards = rows.map((row) => {
      const clusters = clustersByTerm.get(row.term);

      return {
        id: row.id,
        term: row.term,
        definition: row.definition,
        exampleUsage: row.example_usage?.trim() || null,
        clusterSlugs: clusters?.clusterSlugs ?? [
          "business-management-and-administration",
        ],
        clusterLabels: clusters?.clusterLabels ?? [
          clusterLabels["business-management-and-administration"],
        ],
      };
    });

    return {
      setTitle: rows[0]?.set_title ?? VOCAB_SET_TITLE,
      cards,
      clusters: clusterOptionsFor(cards),
    };
  } catch {
    return fromLocalBank();
  }
}
