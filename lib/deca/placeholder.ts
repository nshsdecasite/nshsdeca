export const IA_NAMES: Record<string, string> = {
  PR: "Promotion",
  SE: "Selling",
  IM: "Marketing-Information Management",
  FI: "Financial Analysis",
  CM: "Channel Management",
  MK: "Marketing",
  MP: "Market Planning",
  PI: "Pricing",
  PM: "Product/Service Management",
  CO: "Communication Skills",
  CR: "Customer Relations",
  BL: "Business Law",
  EC: "Economics",
  HR: "Human Resources Management",
  OP: "Operations",
  EI: "Emotional Intelligence",
};

export const FEATURED_EVENTS = [
  "MCS",
  "PMK",
  "ENT",
  "HRM",
  "BFS",
  "FMS",
  "MTDM",
] as const;

export const PLACEHOLDER_SEASON = [
  { label: "Competed at district", count: 148, fill: 1, tone: "ever" as const },
  { label: "Advanced to state", count: 37, fill: 0.25, tone: "ever" as const },
  {
    label: "Advanced to ICDC",
    count: 6,
    fill: 0.04,
    tone: "gold" as const,
    goldCount: true,
  },
];

export const PLACEHOLDER_EVENTS = [
  {
    date: "AUG 25",
    name: "First chapter meeting",
    detail: "Room C114 at 4:15 PM. Dues open the same week.",
  },
  {
    date: "SEP 12",
    name: "Roleplay bootcamp",
    detail: "Officers run live rounds. Bring a laptop and one prepared event.",
  },
  {
    date: "NOV 08",
    name: "District 6 conference",
    detail: "Registration closes October 17. Submit two graded roleplays first.",
  },
];

export const PLACEHOLDER_FEATURES = [
  {
    title: "Take a test",
    body: "Full cluster exams or a short set built from the indicators you keep missing. Every question shows its rationale afterward.",
    href: "/tests",
  },
  {
    title: "Submit a roleplay",
    body: "Pick a scenario, record your ten minutes, and drop the link. An officer grades it against the real rubric.",
    href: "/roleplays",
  },
  {
    title: "Study the indicators",
    body: "Browse performance indicators by cluster, make flashcards, and keep notes that stay with your account.",
    href: "/study",
  },
  {
    title: "Track what improves",
    body: "Accuracy per indicator, score history, and where you stand in the chapter this month.",
    href: "/dashboard",
  },
];

export const PLACEHOLDER_ACCURACY = [
  { name: "Promotion", accuracy: 91 },
  { name: "Selling", accuracy: 84 },
  { name: "Marketing-Information Management", accuracy: 72 },
  { name: "Financial Analysis", accuracy: 61 },
  { name: "Channel Management", accuracy: 54 },
];

export const PLACEHOLDER_SESSIONS = [
  {
    name: "Marketing Cluster Exam",
    kind: "Full test",
    date: "AUG 09",
    score: "81/100",
    gold: false,
    href: "/tests/history",
  },
  {
    name: "Promotion & Selling",
    kind: "Custom, 25q",
    date: "AUG 07",
    score: "19/25",
    gold: false,
    href: "/tests/history",
  },
  {
    name: "MCS 2024 District, attempt 2",
    kind: "Roleplay",
    date: "AUG 05",
    score: "78/100",
    gold: true,
    href: "/submissions",
  },
  {
    name: "Weak indicator drill",
    kind: "Targeted, 15q",
    date: "AUG 03",
    score: "10/15",
    gold: false,
    href: "/tests/history",
  },
  {
    name: "Business Law Exam",
    kind: "Full test",
    date: "JUL 29",
    score: "74/100",
    gold: false,
    href: "/tests/history",
  },
];

export const PLACEHOLDER_WEAK_PIS = [
  {
    code: "FI:341",
    text: "Explain the time value of money",
    meta: "48% · 21 ATTEMPTS",
    href: "/tests/pi-targeted",
  },
  {
    code: "CM:001",
    text: "Explain the nature of channels of distribution",
    meta: "55% · 18 ATTEMPTS",
    href: "/tests/pi-targeted",
  },
  {
    code: "MK:019",
    text: "Explain factors that influence customer buying behavior",
    meta: "62% · 26 ATTEMPTS",
    href: "/tests/pi-targeted",
  },
];

export const PLACEHOLDER_WAITING = [
  { name: "MCS 2025 District", status: "UNDER REVIEW", live: true },
  { name: "PMK 2024 State", status: "SUBMITTED", live: false },
];

export const PLACEHOLDER_SCENARIOS = [
  {
    id: "mcs-2025-d-coffee",
    meta: "MCS · DISTRICT · 2025",
    title: "Regional coffee chain rebrand",
    description:
      "You are the marketing associate. The owner wants a promotional plan for three new locations opening in the same quarter.",
    pis: "MK:019 · PR:001 · CO:087",
    href: "/roleplays",
  },
  {
    id: "mcs-2025-s-loyalty",
    meta: "MCS · STATE · 2025",
    title: "Loyalty program for a bookstore",
    description:
      "Membership sign-ups fell 18% after a price change. Recommend how to restructure rewards without cutting margin.",
    pis: "MK:019 · SE:828 · MP:003",
    href: "/roleplays",
  },
  {
    id: "mcs-2024-d-sponsor",
    meta: "MCS · DISTRICT · 2024",
    title: "Sponsorship pitch to a local bank",
    description:
      "Your athletic department needs a title sponsor. Present the value of the partnership to the branch manager.",
    pis: "PR:249 · CO:084 · EI:009",
    href: "/roleplays",
  },
  {
    id: "mcs-2024-s-crisis",
    meta: "MCS · STATE · 2024",
    title: "Crisis response after a product recall",
    description:
      "A supplier defect reached shelves. Draft the public statement and the message to retail partners.",
    pis: "PR:250 · CO:137 · EI:037",
    href: "/roleplays",
  },
  {
    id: "mcs-2024-d-foodtruck",
    meta: "MCS · DISTRICT · 2024",
    title: "Social campaign for a food truck",
    description:
      "The owner has $500 a month and no following. Build a channel plan and explain how you will measure it.",
    pis: "PR:100 · MK:019 · IM:184",
    href: "/roleplays",
  },
  {
    id: "mcs-2024-s-fitness",
    meta: "MCS · STATE · 2024",
    title: "Repositioning a discount fitness brand",
    description:
      "Two competitors opened within a mile. Advise the owner on pricing strategy and message.",
    pis: "MP:003 · PI:002 · MK:019",
    href: "/roleplays",
  },
];

export const PLACEHOLDER_COMMENTS = [
  {
    id: "c1",
    time: "1:22",
    seconds: 82,
    label: "GREETING",
    text: "Good handshake and role framing. Say the judge's role back to them so the scenario is anchored.",
  },
  {
    id: "c2",
    time: "2:35",
    seconds: 155,
    label: "MK:019",
    text: "You named the target customer but not what drives the purchase. Tie it back to the three new locations.",
  },
  {
    id: "c3",
    time: "3:42",
    seconds: 222,
    label: "PR:001",
    text: "Strongest section. The channel mix was specific and you gave a budget split without being asked.",
    playing: true,
  },
  {
    id: "c4",
    time: "5:58",
    seconds: 358,
    label: "DELIVERY",
    text: "Filler words pick up here. Pause instead — it reads as confidence to a judge.",
  },
  {
    id: "c5",
    time: "7:41",
    seconds: 461,
    label: "CLOSE",
    text: "No ask at the end. Close with the next step you want the owner to approve.",
  },
];

export const RUBRIC_SCALE = [
  { key: "little" as const, label: "Little", score: 5 },
  { key: "below" as const, label: "Below", score: 10 },
  { key: "meets" as const, label: "Meets", score: 15 },
  { key: "exceeds" as const, label: "Exceeds", score: 20 },
];

export function iaName(code: string | null | undefined) {
  if (!code) return "Other";
  const prefix = code.split(":")[0]?.toUpperCase() ?? code;
  return IA_NAMES[prefix] ?? code;
}

export function accuracyTone(accuracy: number): "gold" | "ever" | "ever-dim" {
  if (accuracy >= 84) return "gold";
  if (accuracy >= 61) return "ever";
  return "ever-dim";
}
