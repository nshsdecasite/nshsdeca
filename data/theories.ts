import type { ClusterSlug } from "@/data/vocab-clusters";

export type TheoryCategory = "motivational" | "psychological" | "fallacy";

export type TheorySeed = {
  theoryName: string;
  category: TheoryCategory;
  explanation: string;
  exampleScenario: string;
  clusterSlug: ClusterSlug;
};

export const theoryCategories: TheoryCategory[] = [
  "motivational",
  "psychological",
  "fallacy",
];

export const theoryCategoryLabels: Record<TheoryCategory, string> = {
  motivational: "Motivational",
  psychological: "Psychological",
  fallacy: "Fallacy",
};

export const theories: TheorySeed[] = [
  {
    theoryName: "Maslow's Hierarchy of Needs",
    category: "motivational",
    explanation:
      "A five-level model of human motivation, from basic physiological needs up to self-actualization, arguing lower needs must be met before higher ones motivate behavior.",
    exampleScenario:
      "A manager offers fair pay and safe working conditions (lower needs) before expecting employees to be motivated by recognition or creative growth (higher needs).",
    clusterSlug: "business-management-and-administration",
  },
  {
    theoryName: "Herzberg's Two-Factor Theory",
    category: "motivational",
    explanation:
      "Distinguishes hygiene factors (pay, conditions) that prevent dissatisfaction from motivators (achievement, recognition) that drive genuine satisfaction and effort.",
    exampleScenario:
      "A company raises salaries but sees no productivity increase, since pay is a hygiene factor, not a true motivator.",
    clusterSlug: "business-management-and-administration",
  },
  {
    theoryName: "Theory X and Theory Y",
    category: "psychological",
    explanation:
      "Contrasts two management assumptions about workers: Theory X assumes employees are inherently unmotivated and need control; Theory Y assumes employees are self-motivated and seek responsibility.",
    exampleScenario:
      "A Theory Y manager delegates decision-making to a team, trusting them to stay engaged without close supervision.",
    clusterSlug: "business-management-and-administration",
  },
  {
    theoryName: "Expectancy Theory",
    category: "motivational",
    explanation:
      "Holds that motivation depends on an employee's belief that effort will lead to performance, and performance will lead to a valued reward.",
    exampleScenario:
      "A salesperson works harder toward a quota only if they believe hitting it will actually result in the promised bonus.",
    clusterSlug: "business-management-and-administration",
  },
  {
    theoryName: "Groupthink",
    category: "fallacy",
    explanation:
      "Describes how a group's desire for harmony can override critical evaluation, leading members to accept a decision without voicing doubts.",
    exampleScenario:
      "A team approves a risky product launch because no one wants to be the lone dissenting voice in the meeting.",
    clusterSlug: "business-management-and-administration",
  },
  {
    theoryName: "Diffusion of Innovation Theory",
    category: "psychological",
    explanation:
      "Explains how new products spread through a market via distinct adopter groups: innovators, early adopters, early majority, late majority, and laggards.",
    exampleScenario:
      "A tech company markets a new gadget first to enthusiasts (innovators) before it appeals to the broader mainstream market.",
    clusterSlug: "marketing",
  },
  {
    theoryName: "Hierarchy of Effects Model",
    category: "psychological",
    explanation:
      "Describes the sequential stages a consumer moves through before purchasing: awareness, knowledge, liking, preference, conviction, and purchase.",
    exampleScenario:
      "An ad campaign builds brand awareness first, then follows up with content designed to build preference before asking for a sale.",
    clusterSlug: "marketing",
  },
  {
    theoryName: "Anchoring Bias",
    category: "fallacy",
    explanation:
      "The tendency to rely too heavily on the first piece of information encountered (the anchor) when making decisions.",
    exampleScenario:
      "A shopper perceives a $60 item as a bargain because it's displayed next to a crossed-out original price of $120.",
    clusterSlug: "marketing",
  },
  {
    theoryName: "Bandwagon Effect",
    category: "fallacy",
    explanation:
      "The tendency for people to adopt a behavior or belief because many others have already done so, regardless of their own independent judgment.",
    exampleScenario:
      "A product marketed as the #1 bestseller sees a further sales boost simply from being labeled popular.",
    clusterSlug: "marketing",
  },
  {
    theoryName: "Elaboration Likelihood Model",
    category: "psychological",
    explanation:
      "Explains two routes to persuasion: a central route based on careful reasoning about message content, and a peripheral route based on surface cues like attractiveness or emotion.",
    exampleScenario:
      "A luxury car ad uses a peripheral cue (a celebrity endorsement) rather than technical specifications to persuade an uninvolved viewer.",
    clusterSlug: "marketing",
  },
  {
    theoryName: "Efficient Market Hypothesis",
    category: "psychological",
    explanation:
      "Argues that asset prices fully reflect all available information at any given time, making it difficult to consistently outperform the market.",
    exampleScenario:
      "An investor concludes that picking individual undervalued stocks is unlikely to beat a diversified index fund over the long run.",
    clusterSlug: "finance",
  },
  {
    theoryName: "Prospect Theory",
    category: "psychological",
    explanation:
      "Describes how people evaluate potential losses and gains asymmetrically, generally feeling the pain of a loss more strongly than the pleasure of an equivalent gain.",
    exampleScenario:
      "An investor holds onto a losing stock too long, hoping to avoid locking in the loss, even when selling would be the more rational choice.",
    clusterSlug: "finance",
  },
  {
    theoryName: "Sunk Cost Fallacy",
    category: "fallacy",
    explanation:
      "The mistaken belief that money or effort already invested justifies continuing a course of action, even when future costs outweigh future benefits.",
    exampleScenario:
      "A company keeps funding a failing project because of how much has already been spent, rather than evaluating it on its remaining prospects.",
    clusterSlug: "finance",
  },
  {
    theoryName: "Modern Portfolio Theory",
    category: "psychological",
    explanation:
      "A framework showing how investors can construct a portfolio to maximize expected return for a given level of risk through diversification.",
    exampleScenario:
      "An investor spreads funds across stocks, bonds, and real estate rather than a single asset to reduce overall portfolio risk.",
    clusterSlug: "finance",
  },
  {
    theoryName: "Lean Startup Methodology",
    category: "psychological",
    explanation:
      "A theory of new-venture development emphasizing rapid, iterative testing of a minimum viable product to validate assumptions before scaling.",
    exampleScenario:
      "A founder releases a stripped-down app version to a small audience to test demand before investing in full development.",
    clusterSlug: "entrepreneurship",
  },
  {
    theoryName: "Confirmation Bias",
    category: "fallacy",
    explanation:
      "The tendency to seek out, interpret, and remember information in ways that confirm one's existing beliefs.",
    exampleScenario:
      "An entrepreneur only reads customer feedback that supports their product idea, dismissing early warning signs from skeptical users.",
    clusterSlug: "entrepreneurship",
  },
  {
    theoryName: "Blue Ocean Strategy",
    category: "psychological",
    explanation:
      "A theory suggesting sustainable growth comes from creating uncontested market space (blue oceans) rather than competing head-on in existing, crowded markets (red oceans).",
    exampleScenario:
      "A fitness company creates a new category of low-impact, at-home group workouts instead of competing directly with established gyms.",
    clusterSlug: "entrepreneurship",
  },
  {
    theoryName: "Servicescape Theory",
    category: "psychological",
    explanation:
      "Describes how the physical environment of a service business (layout, ambiance, signage) shapes customer perceptions and behavior.",
    exampleScenario:
      "A hotel redesigns its lobby lighting and layout to make guests feel more relaxed and likely to linger and spend at the bar.",
    clusterSlug: "hospitality-and-tourism",
  },
  {
    theoryName: "Disconfirmation of Expectations Theory",
    category: "psychological",
    explanation:
      "Holds that customer satisfaction is determined by the gap between expected and actual service performance, not performance alone.",
    exampleScenario:
      "A guest who expected only basic amenities is highly satisfied with an average hotel room, while a guest expecting luxury is disappointed by the same room.",
    clusterSlug: "hospitality-and-tourism",
  },
  {
    theoryName: "Halo Effect",
    category: "fallacy",
    explanation:
      "The tendency for an overall positive impression of a person, brand, or company to unfairly influence judgments of specific, unrelated qualities.",
    exampleScenario:
      "A well-known ethical brand's new product is assumed to be high-quality by consumers, even before they've tried it.",
    clusterSlug: "business-management-and-administration",
  },
];
