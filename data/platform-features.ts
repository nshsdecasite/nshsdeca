export type PlatformFeature = {
  title: string;
  description: string;
  href: string;
  badge?: "coming-soon" | "officer";
};

export type PlatformSection = {
  title: string;
  description: string;
  features: PlatformFeature[];
};

export const platformSections: PlatformSection[] = [
  {
    title: "Practice tests",
    description:
      "Question bank with PI tagging, rationales, and progress tracking from every answer.",
    features: [
      {
        title: "Full practice test",
        description:
          "Standard 100-question format with timed or untimed mode and a full score breakdown.",
        href: "/tests/full",
      },
      {
        title: "Custom test",
        description:
          "Choose question count and filter by cluster, instructional area, PIs, or level.",
        href: "/tests/custom",
      },
      {
        title: "PI-targeted test",
        description:
          "Auto-generates a quiz from your weakest Performance Indicators.",
        href: "/tests/pi-targeted",
      },
      {
        title: "Test history & review",
        description:
          "Review scores, rationales, PI summaries, and notes from past attempts.",
        href: "/tests/history",
      },
    ],
  },
  {
    title: "Roleplays",
    description:
      "Browse scenarios, submit video attempts, and receive rubric-based officer feedback.",
    features: [
      {
        title: "Scenario library",
        description:
          "Filter by event, cluster, PI, year, and competition level (district, state, ICDC).",
        href: "/roleplays",
      },
      {
        title: "Submit a roleplay",
        description:
          "Record and upload a video attempt for grading by chapter officers.",
        href: "/roleplays/submit",
      },
      {
        title: "My submissions",
        description:
          "Track status, rubric scores, timestamped comments, and PI breakdowns.",
        href: "/submissions",
      },
      {
        title: "Grade submissions",
        description:
          "Officer view with embedded video, timeline comments, and rubric scoring.",
        href: "/admin/grading",
        badge: "officer",
      },
    ],
  },
  {
    title: "Study tools",
    description:
      "PI browser, flashcards, theories, visuals, and personal notes — all in one hub.",
    features: [
      {
        title: "PI browser",
        description:
          "Search and filter the full Performance Indicator database by cluster, area, and tier.",
        href: "/study/pis",
      },
      {
        title: "PI flashcards",
        description:
          "Premade sets by cluster and instructional area with learn, test, and match modes.",
        href: "/study/flashcards",
      },
      {
        title: "Vocab flashcards",
        description:
          "Cluster and event vocab with definitions and example usage in context.",
        href: "/study/vocab",
      },
      {
        title: "Theories & fallacies",
        description:
          "Motivational frameworks, psychological principles, and logical fallacy drills.",
        href: "/study/theories",
      },
      {
        title: "Visual reference library",
        description:
          "BCG, SWOT, Ansoff, and other charts and matrices organized by cluster.",
        href: "/study/visuals",
      },
      {
        title: "Personal notes",
        description:
          "Tabbed notebooks with rich text, auto-save, and search across all notes.",
        href: "/notes",
      },
    ],
  },
  {
    title: "Progress & engagement",
    description:
      "Dashboard stats, PI heatmaps, points, and the chapter leaderboard.",
    features: [
      {
        title: "Your dashboard",
        description:
          "Rolling PI accuracy, recent activity, weak PIs, and quick links to keep studying.",
        href: "/dashboard",
      },
      {
        title: "Leaderboard",
        description:
          "Chapter-wide rankings by total points with weekly and all-time views.",
        href: "/leaderboard",
      },
      {
        title: "Profile & settings",
        description:
          "Display name, grade, event, avatar, and leaderboard visibility preferences.",
        href: "/profile",
      },
      {
        title: "Admin panel",
        description:
          "Announcements, officer management, chapter dashboards, and data export.",
        href: "/admin",
        badge: "officer",
      },
    ],
  },
];
