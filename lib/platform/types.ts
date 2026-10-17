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
  avg_test_pct?: number | null;
  roleplays_submitted: number;
  roleplays_graded?: number;
  total_pi_count?: number;
  event_pi_count?: number;
  event_pis_studied?: number;
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
  username?: string | null;
  username_confirmed?: boolean;
  grade_level: number | null;
  role: string | null;
  total_points: number;
  avatar_url: string | null;
  is_public_on_leaderboard: boolean;
  chapter_name: string | null;
  school_name: string | null;
  event_code?: string | null;
  event_name?: string | null;
  cluster_slug?: string | null;
  cluster_name?: string | null;
  event_pi_count?: number;
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

export type AnnouncementReactionName = "like" | "love" | "laugh" | "celebrate" | "eyes";

export type AnnouncementReaction = {
  reaction: AnnouncementReactionName;
  count: number;
  mine: boolean;
};

export type Announcement = {
  id: string;
  message: string;
  visible_to: string;
  created_at: string;
  expires_at: string | null;
  author_name: string | null;
  reactions?: AnnouncementReaction[];
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

export type ChapterTestTabLeave = {
  session_id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  exam_title: string | null;
  exam_code: string | null;
  score: number | null;
  total_questions: number;
  completed_at: string;
  tab_leave_count: number;
};

export type SolutionPeek = {
  id: string;
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  scenario_id: string;
  event_code: string;
  scenario_title: string | null;
  scenario_number: number;
  year: number;
  level: string;
  checked_at: string;
  attempted_after: boolean;
};

export type ChapterMember = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
  username?: string | null;
  username_confirmed?: boolean;
  grade_level: number | null;
  role: "student" | "officer" | "advisor";
  event_code?: string | null;
  event_name?: string | null;
  is_super_admin?: boolean;
  total_points: number;
  last_login?: string | null;
  created_at: string;
};

export type MemberDossier = {
  profile: Record<string, unknown>;
  events: { event_code: string; event_name: string }[];
  tests: {
    id: string;
    session_type: string | null;
    exam_code: string | null;
    exam_title: string | null;
    score: number | null;
    total_questions: number | null;
    started_at: string | null;
    completed_at: string | null;
    answered: number;
    correct_answers: number;
  }[];
  submissions: {
    id: string;
    status: string | null;
    attempt_number: number | null;
    submitted_at: string | null;
    reviewed_at: string | null;
    video_url: string | null;
    video_source: string | null;
    duration_seconds: number | null;
    scenario_key: string | null;
    event_code: string | null;
    scenario_title: string | null;
    scenario_number: number | null;
    year: number | null;
    level: string | null;
    grading_data: { total_score?: number | null } | null;
  }[];
  pi_performance: {
    pi_code: string;
    indicator_text: string | null;
    source: string | null;
    total_attempts: number;
    correct_count: number;
    last_updated: string | null;
  }[];
  points: {
    id: string;
    points_earned: number | null;
    action_type: string | null;
    reference_type: string | null;
    reference_id: string | null;
    earned_at: string | null;
  }[];
  peeks: {
    id: string;
    created_at: string;
    event_code: string | null;
    scenario_title: string | null;
    scenario_number: number | null;
    year: number | null;
    level: string | null;
  }[];
  tab_leaves: {
    id: string;
    session_id: string | null;
    event_type: string;
    created_at: string;
  }[];
  notes: {
    id: string;
    tab_name: string | null;
    content: { text?: string } | null;
    updated_at: string | null;
  }[];
  generated_scenarios: {
    id: string;
    event_code: string | null;
    scenario_title: string | null;
    year: number | null;
    level: string | null;
    review_status: string | null;
  }[];
  flashcards: { learning: number; know_it: number };
  messages: { sent: number; received: number };
  friendships: {
    status: string | null;
    created_at: string | null;
    responded_at: string | null;
    other_name: string | null;
  }[];
  reactions: { reaction: string; created_at: string }[];
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

export type ChapterEvent = {
  id: string;
  title: string;
  detail: string | null;
  location: string | null;
  starts_at: string;
  ends_at: string | null;
  created_at?: string;
};
