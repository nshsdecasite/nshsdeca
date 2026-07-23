export type VideoSource = "youtube" | "google-drive";

export type SubmissionStatus = "submitted" | "under_review" | "reviewed";

export type CommentTag =
  | "PI-1"
  | "PI-2"
  | "PI-3"
  | "PI-4"
  | "PI-5"
  | "21st-century"
  | "general";

export interface Scenario {
  id: string;
  title: string;
  description: string;
  event: string;
  pis: string[];
}

export interface TimestampedComment {
  id: string;
  timestamp: number;
  text: string;
  tag: CommentTag;
}

export interface RubricScores {
  piScores: Record<string, number>;
  centurySkills: number;
  maxPiScore: number;
  maxCenturyScore: number;
}

export interface Grading {
  comments: TimestampedComment[];
  rubric: RubricScores;
  piFeedback: Record<string, string>;
  centuryFeedback: string;
  overallFeedback: string;
  videoDuration?: number;
  gradedAt?: string;
  officerName: string;
}

export interface Submission {
  id: string;
  user_id: string;
  scenario_key: string;
  video_url: string;
  video_source: VideoSource;
  attempt_number: number;
  status: SubmissionStatus;
  submitted_at: string;
  reviewed_at?: string | null;
  duration_seconds?: number | null;
  grading_data?: Grading | null;
  student_name?: string;
  student_email?: string;
}

export const COMMENT_TAG_LABELS: Record<CommentTag, string> = {
  "PI-1": "PI 1",
  "PI-2": "PI 2",
  "PI-3": "PI 3",
  "PI-4": "PI 4",
  "PI-5": "PI 5",
  "21st-century": "21st Century Skills",
  general: "General",
};

export const STATUS_LABELS: Record<SubmissionStatus, string> = {
  submitted: "Submitted",
  under_review: "Under Review",
  reviewed: "Reviewed",
};

export function getTotalScore(rubric: RubricScores): number {
  const piTotal = Object.values(rubric.piScores).reduce((a, b) => a + b, 0);
  return piTotal + rubric.centurySkills;
}

export function getMaxScore(rubric: RubricScores): number {
  const piCount = Object.keys(rubric.piScores).length;
  return piCount * rubric.maxPiScore + rubric.maxCenturyScore;
}

export function extractDriveFileId(url: string): string | null {
  const match = url.match(/\/d\/([^/]+)/) || url.match(/[?&]id=([^&]+)/);
  return match ? match[1] : null;
}

export function toDriveEmbedUrl(url: string): string {
  const id = extractDriveFileId(url);
  if (id) return `https://drive.google.com/file/d/${id}/preview`;
  return url;
}

export function createEmptyPiFeedback(piCount: number): Record<string, string> {
  const feedback: Record<string, string> = {};
  for (let i = 1; i <= piCount; i++) {
    feedback[`PI-${i}`] = "";
  }
  return feedback;
}

export function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function parseDurationInput(minutes: number, seconds: number): number {
  return Math.max(0, minutes) * 60 + Math.max(0, Math.min(59, seconds));
}
