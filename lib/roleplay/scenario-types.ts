export type ScenarioSummary = {
  id: string;
  event_code: string;
  event_name: string;
  cluster_name: string | null;
  year: number;
  level: "district" | "state" | "icdc";
  scenario_number: number;
  scenario_title: string | null;
  instructional_area_code: string | null;
  career_pathway: string | null;
  preview: string | null;
};

export type ScenarioPerformanceIndicator = {
  pi_id: string | null;
  pi_code: string | null;
  indicator_text: string;
  display_order: number;
};

export type ScenarioDetail = {
  id: string;
  event_code: string;
  event_name: string;
  cluster_name: string | null;
  year: number;
  level: "district" | "state" | "icdc";
  scenario_number: number;
  scenario_title: string | null;
  instructional_area_code: string | null;
  instructional_area_name: string | null;
  career_pathway: string | null;
  situation_description: string | null;
  judge_characterization: string | null;
  solution_text: string | null;
  source_url: string | null;
  pis?: ScenarioPerformanceIndicator[];
};

export type ScenarioFilterOptions = {
  years: number[];
  events: { event_code: string; event_name: string }[];
  levels: string[];
};

export const LEVEL_LABELS: Record<ScenarioSummary["level"], string> = {
  district: "District",
  state: "State",
  icdc: "ICDC",
};
