export type PiHeatmapCell = {
  id: string;
  pi_code: string;
  indicator_text: string;
  instructional_area_code: string | null;
  total_attempts: number;
  correct_count: number;
  accuracy: number;
};

export type DashboardStats = {
  total_points: number;
  tests_completed: number;
  roleplays_submitted: number;
  roleplays_graded?: number;
  total_pi_count?: number;
  weak_pis: {
    id: string;
    pi_code: string;
    indicator_text: string;
    total_attempts: number;
    correct_count: number;
    accuracy: number;
  }[];
  recent_sessions: {
    id: string;
    session_type: string;
    title: string | null;
    score: number | null;
    total_questions: number;
    completed_at: string | null;
    started_at: string;
  }[];
};

export type UserProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  grade_level: number | null;
  role: string | null;
  total_points: number;
  avatar_url: string | null;
  is_public_on_leaderboard: boolean;
  chapter_name: string | null;
  school_name: string | null;
};

export type LeaderboardEntry = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  grade_level: number | null;
  total_points: number;
  rank: number;
};

export type Note = {
  id: string;
  tab_name: string;
  content: { text?: string };
  updated_at: string;
};

export type FlashcardSetSummary = {
  id: string;
  title: string;
  instructional_area_code: string | null;
  card_count: number;
  known_count: number;
};

export type Flashcard = {
  id: string;
  front_text: string;
  back_text: string;
  pi_id: string | null;
  status: "learning" | "know_it";
};

export type Announcement = {
  id: string;
  message: string;
  visible_to: string;
  created_at: string;
  expires_at: string | null;
  author_name: string | null;
};

export type AdminOverview = {
  student_count: number;
  pending_submissions: number;
  tests_this_week: number;
  tests_completed_total?: number;
  roleplays_submitted_total?: number;
  roleplays_graded_total?: number;
  tab_blur_events_total?: number;
  announcements: Announcement[];
};

export type ChapterActivity = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  grade_level: number | null;
  role: string;
  total_points: number;
  tests_completed: number;
  roleplays_submitted: number;
  roleplays_graded: number;
  avg_test_pct: number | null;
  avg_roleplay_score: number | null;
  tab_blur_count: number;
  last_test_at: string | null;
  last_roleplay_at: string | null;
};

export type ChapterMember = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  grade_level: number | null;
  role: "student" | "officer" | "advisor";
  total_points: number;
  created_at: string;
};

export type MessageableMember = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  role: "student" | "officer" | "advisor";
  grade_level: number | null;
};

export type MessageConversation = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  role: string | null;
  last_body: string;
  last_at: string;
  unread_count: number;
};

export type DirectMessage = {
  id: string;
  sender_id: string;
  recipient_id: string;
  body: string;
  created_at: string;
  read_at: string | null;
};
