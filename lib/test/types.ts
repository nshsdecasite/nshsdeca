export type ExamSummary = {
  id: string;
  exam_code: string;
  title: string;
  year: number;
  cluster_slug: string;
  cluster_name: string;
  question_count: number;
};

export type TestChoice = {
  id: string;
  label: string;
  text: string;
  is_correct: boolean | null;
};

export type TestQuestion = {
  id: string;
  display_order: number;
  question_text: string;
  pi_id: string | null;
  pi_code: string | null;
  rationale: string | null;
  choices: TestChoice[];
  chosen_choice_id: string | null;
  is_correct: boolean | null;
};

export type TestSession = {
  id: string;
  session_type: string;
  exam_id: string | null;
  exam_code: string | null;
  exam_title: string | null;
  exam_year: number | null;
  cluster_name: string | null;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  total_questions: number;
  questions: TestQuestion[];
};

export type TestSessionSummary = {
  id: string;
  session_type: string;
  exam_code: string | null;
  exam_title: string | null;
  exam_year: number | null;
  cluster_name: string | null;
  started_at: string;
  completed_at: string | null;
  score: number | null;
  total_questions: number;
};
