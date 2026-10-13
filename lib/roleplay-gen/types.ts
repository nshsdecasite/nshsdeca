export type EventCategory =
  | "principles"
  | "individual_series"
  | "team_decision_making"
  | "personal_financial_literacy"
  | "professional_selling_and_consulting"
  | "integrated_marketing_campaign";

export type CalculationsMode = "always" | "optional" | "never";

export type KitEvent = {
  code: string;
  name: string;
  category: EventCategory;
  cluster: string;
  generate_roleplay: boolean;
  participants: number;
  roleplay_pools: string[];
  pathway: string | null;
  pathway_pool: string | null;
  pi_count: number;
  prep_minutes: number;
  present_minutes: number;
  rubric: "standard_5pi" | "principles_4pi" | "pfl_3pi";
  scenario_focus: string;
  solution_first_criterion: string;
  header_lines: string[];
  situation_word_range: [number, number];
  eval_weighting_line: string;
  judge_questions_timing: string;
  judge_solution_page: boolean | string;
};

export type Candidate = {
  code: string;
  text: string;
  displayText: string;
  level: string;
  iaCode: string;
  iaName: string;
  performanceElement: string;
  pool: string;
  pools: string[];
  tier: number;
};

export type PflOutcome = {
  id: string;
  displayText: string;
  grade: number;
  topic: string;
  topicNumeral: string;
  standardUid: string;
  standardId: string;
};

export type SelectedPi = {
  code: string;
  display_text: string;
  level: string;
  pool: string;
  ia: string;
  iaCode: string;
  performance_element: string;
};

export type Selection = {
  eventCode: string;
  primaryIA: { code: string; name: string };
  pis: SelectedPi[];
  pfl?: { topic: string; outcomes: Array<{ id: string; display_text: string }> };
  seed: number;
};

export type BodyBlock =
  | { type: "p"; text: string }
  | { type: "bullets"; items: string[] };

export type Calculation = {
  label: string;
  formula: string;
  expression: string;
  result: number;
  unit: string;
};

export type JudgeSolution = {
  conceptIntro: string;
  conceptBullets: string[];
  steps: string[];
  modelConclusion: string;
};

export type ScenarioDraft = {
  participant_role: string;
  participant_roles: string[] | null;
  preposition: "at" | "for" | "of" | "with" | null;
  company_name: string | null;
  company_descriptor: string | null;
  judge_ref: string;
  core_task: string;
  situation_body: BodyBlock[];
  judge_body: BodyBlock[];
  presentation_noun: "ideas" | "plan" | "recommendation" | "information";
  closing_location: string;
  judge_opening: string;
  thanks_for: "work" | "information";
  meeting_word: "meeting" | "role-play";
  judge_questions: [string, string];
  internal_notes: {
    pi_hooks: Record<string, string>;
    strong_answer_outline: string[];
    calculations: Calculation[];
  };
  judge_solution: JudgeSolution | null;
};

export type RubricBand = [number, number];

export type RubricItem = {
  label: string;
  description: string;
  calculation_event_variant?: { label: string; description: string };
};

export type RubricSection = {
  name: string;
  per_pi?: boolean;
  count?: number;
  max_each: number;
  bands: Record<string, RubricBand>;
  items?: RubricItem[];
};

export type RubricForm = {
  used_by: string[];
  sections: RubricSection[];
  total: number;
};

export type EvaluationRow = {
  section: string;
  label: string;
  description: string;
  max: number;
  bands: { level: string; range: string }[];
};

export type PracticePacket = {
  idLabel: string;
  title: string;
  headerLines: { label: string; value: string }[];
  instructions: string[];
  solution: { label: string; description: string }[];
  competencies: { label: string; description: string }[];
  performanceIndicators: string[];
  opening: string;
  blocks: BodyBlock[];
  closing: string;
  wordCount: number;
  wordRange: [number, number];
  judgeIntro: string;
  judgeBlocks: BodyBlock[];
  judgeProcedure: string;
  judgeQuestions: [string, string];
  judgeSolution: JudgeSolution | null;
  evaluation: {
    formTitle: string;
    instructionalArea: string;
    weighting: string;
    levels: string[];
    focusAreas: { name: string; cells: string[] }[];
    rows: EvaluationRow[];
    total: number;
  };
  studyNotes: {
    hooks: { label: string; hook: string }[];
    outline: string[];
  };
  companyName: string | null;
  seed: number;
  model: string;
};

export type GeneratorEvent = {
  code: string;
  name: string;
  category: string;
  pathway: string | null;
  piCount: number;
  prepMinutes: number;
  presentMinutes: number;
  areas: { code: string; name: string }[];
  calculations: CalculationsMode;
};

export type GenerateInput = {
  eventCode: string;
  primaryIA?: string;
  calculations?: boolean;
  avoid?: string[];
};
