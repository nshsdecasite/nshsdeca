export type PiSummary = {
  id: string;
  pi_code: string;
  indicator_text: string;
  instructional_area_code: string | null;
  instructional_area_name: string | null;
  cluster_slug: string | null;
  cluster_name: string | null;
  question_count: number;
  roleplay_count: number;
};

export type PiQuestionLink = {
  id: string;
  question_text: string;
  exam_code: string | null;
  exam_year: number | null;
  cluster_name: string | null;
  display_order: number | null;
};

export type PiRoleplayContext = {
  event_code: string;
  event_name: string;
  year: number;
  cluster_name: string | null;
  scenario_count: number;
};

export type PiDetail = {
  id: string;
  pi_code: string;
  indicator_text: string;
  instructional_area_code: string | null;
  instructional_area_name: string | null;
  cluster_slug: string | null;
  cluster_name: string | null;
  question_count: number;
  roleplay_count: number;
  questions: PiQuestionLink[];
  roleplay_contexts: PiRoleplayContext[];
};

export type PiFilterOptions = {
  instructional_areas: { code: string; name: string }[];
  clusters: { slug: string; name: string }[];
};
