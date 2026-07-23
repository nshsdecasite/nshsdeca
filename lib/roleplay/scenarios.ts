import type { Scenario } from "@/lib/roleplay/types";

export const SCENARIOS: Scenario[] = [
  {
    id: "sc-001",
    title: "Customer Complaint Resolution",
    description:
      "A dissatisfied customer approaches you about a defective product they purchased last week. Handle the complaint professionally and offer a resolution.",
    event: "Principles of Business Management",
    pis: [
      "Explain the role of customer service in business",
      "Demonstrate effective communication techniques",
      "Apply problem-solving strategies",
      "Describe conflict resolution methods",
      "Identify customer retention strategies",
    ],
  },
  {
    id: "sc-002",
    title: "Team Leadership Challenge",
    description:
      "Your team is behind on a major project deadline. Two team members are in conflict. Address the situation as the team leader.",
    event: "Business Management & Administration",
    pis: [
      "Demonstrate leadership qualities",
      "Facilitate team collaboration",
      "Manage project timelines",
      "Resolve interpersonal conflicts",
      "Motivate team members",
    ],
  },
  {
    id: "sc-003",
    title: "Marketing Pitch to Client",
    description:
      "Present a marketing campaign proposal to a potential client who is skeptical about social media advertising ROI.",
    event: "Marketing",
    pis: [
      "Present marketing concepts clearly",
      "Analyze target market demographics",
      "Justify budget allocation",
      "Address client objections",
      "Close with a call to action",
    ],
  },
  {
    id: "sc-004",
    title: "Financial Advisory Meeting",
    description:
      "A young professional seeks advice on starting an investment portfolio with limited funds. Provide guidance on financial planning.",
    event: "Finance",
    pis: [
      "Explain investment fundamentals",
      "Assess risk tolerance",
      "Recommend appropriate investment vehicles",
      "Discuss diversification strategies",
      "Communicate financial concepts accessibly",
    ],
  },
];

export const MAX_PI_SCORE = 20;
export const MAX_CENTURY_SCORE = 20;

export function getScenario(id: string) {
  return SCENARIOS.find((scenario) => scenario.id === id);
}
