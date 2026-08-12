export type VisualCategory =
  | "Finance"
  | "Marketing"
  | "Management"
  | "Operations"
  | "Entrepreneurship"
  | "Human Resources"
  | "Economics"
  | "Business Law"
  | "Strategy";

export type VisualItem = {
  id: string;
  title: string;
  category: VisualCategory;
  type: "svg" | "html";
  src: string;
};

export const visualCategories: VisualCategory[] = [
  "Finance",
  "Marketing",
  "Management",
  "Operations",
  "Entrepreneurship",
  "Human Resources",
  "Economics",
  "Business Law",
  "Strategy",
];

export const visuals: VisualItem[] = [
  {
    id: "break-even-analysis",
    title: "Break-Even Analysis",
    category: "Finance",
    type: "html",
    src: "/visuals/deca/Break-Even%20Analysis.dc.html",
  },
  {
    id: "time-value-of-money",
    title: "Time Value of Money",
    category: "Finance",
    type: "html",
    src: "/visuals/deca/Time%20Value%20of%20Money.dc.html",
  },
  {
    id: "financial-statement-flow",
    title: "Financial Statement Flow",
    category: "Finance",
    type: "html",
    src: "/visuals/deca/Financial%20Statement%20Flow.dc.html",
  },
  {
    id: "rule-of-72",
    title: "Rule of 72",
    category: "Finance",
    type: "html",
    src: "/visuals/deca/Rule%20of%2072.dc.html",
  },
  {
    id: "balance-sheet-equation",
    title: "Balance Sheet Equation",
    category: "Finance",
    type: "svg",
    src: "/visuals/svg/balance_sheet_equation.svg",
  },
  {
    id: "cash-conversion-cycle",
    title: "Cash Conversion Cycle",
    category: "Finance",
    type: "svg",
    src: "/visuals/svg/cash_conversion_cycle.svg",
  },
  {
    id: "stp-model",
    title: "STP Model",
    category: "Marketing",
    type: "html",
    src: "/visuals/deca/STP%20Model.dc.html",
  },
  {
    id: "perceptual-map",
    title: "Perceptual Map",
    category: "Marketing",
    type: "html",
    src: "/visuals/deca/Perceptual%20Map.dc.html",
  },
  {
    id: "aida-model",
    title: "AIDA Model",
    category: "Marketing",
    type: "html",
    src: "/visuals/deca/AIDA%20Model.dc.html",
  },
  {
    id: "coupon-ad-mockup",
    title: "Coupon Ad Mockup",
    category: "Marketing",
    type: "html",
    src: "/visuals/deca/Coupon%20Ad%20Mockup.dc.html",
  },
  {
    id: "marketing-mix-4ps",
    title: "Marketing Mix (4 Ps)",
    category: "Marketing",
    type: "svg",
    src: "/visuals/svg/marketing_mix_4ps.svg",
  },
  {
    id: "product-life-cycle",
    title: "Product Life Cycle",
    category: "Marketing",
    type: "svg",
    src: "/visuals/svg/product_life_cycle.svg",
  },
  {
    id: "decision-making-process",
    title: "Decision-Making Process",
    category: "Management",
    type: "html",
    src: "/visuals/deca/Decision-Making%20Process.dc.html",
  },
  {
    id: "communication-process",
    title: "Communication Process",
    category: "Management",
    type: "svg",
    src: "/visuals/svg/communication_process.svg",
  },
  {
    id: "smart-goals",
    title: "SMART Goals",
    category: "Management",
    type: "svg",
    src: "/visuals/svg/smart_goals.svg",
  },
  {
    id: "pdca-cycle",
    title: "PDCA Cycle",
    category: "Operations",
    type: "svg",
    src: "/visuals/svg/pdca_cycle.svg",
  },
  {
    id: "six-sigma-dmaic",
    title: "Six Sigma (DMAIC)",
    category: "Operations",
    type: "svg",
    src: "/visuals/svg/six_sigma_dmaic.svg",
  },
  {
    id: "just-in-time-inventory",
    title: "Just-In-Time Inventory Flow",
    category: "Operations",
    type: "html",
    src: "/visuals/deca/Just-In-Time%20Inventory%20Flow.dc.html",
  },
  {
    id: "business-plan-components",
    title: "Business Plan Components",
    category: "Entrepreneurship",
    type: "html",
    src: "/visuals/deca/Business%20Plan%20Components.dc.html",
  },
  {
    id: "elevator-pitch-structure",
    title: "Elevator Pitch Structure",
    category: "Entrepreneurship",
    type: "html",
    src: "/visuals/deca/Elevator%20Pitch%20Structure.dc.html",
  },
  {
    id: "funding-ladder",
    title: "Funding Ladder",
    category: "Entrepreneurship",
    type: "html",
    src: "/visuals/deca/Funding%20Ladder.dc.html",
  },
  {
    id: "recruitment-selection-funnel",
    title: "Recruitment & Selection Funnel",
    category: "Human Resources",
    type: "html",
    src: "/visuals/deca/Recruitment%20Selection%20Funnel.dc.html",
  },
  {
    id: "performance-appraisal-cycle",
    title: "Performance Appraisal Cycle",
    category: "Human Resources",
    type: "html",
    src: "/visuals/deca/Performance%20Appraisal%20Cycle.dc.html",
  },
  {
    id: "maslows-hierarchy",
    title: "Maslow's Hierarchy",
    category: "Human Resources",
    type: "svg",
    src: "/visuals/svg/maslows_hierarchy.svg",
  },
  {
    id: "circular-flow-of-income",
    title: "Circular Flow of Income",
    category: "Economics",
    type: "html",
    src: "/visuals/deca/Circular%20Flow%20of%20Income.dc.html",
  },
  {
    id: "market-structure-spectrum",
    title: "Market Structure Spectrum",
    category: "Economics",
    type: "html",
    src: "/visuals/deca/Market%20Structure%20Spectrum.dc.html",
  },
  {
    id: "production-possibilities-frontier",
    title: "Production Possibilities Frontier",
    category: "Economics",
    type: "html",
    src: "/visuals/deca/Production%20Possibilities%20Frontier.dc.html",
  },
  {
    id: "business-cycle",
    title: "Business Cycle",
    category: "Economics",
    type: "svg",
    src: "/visuals/svg/business_cycle.svg",
  },
  {
    id: "supply-demand-curve",
    title: "Supply & Demand Curve",
    category: "Economics",
    type: "svg",
    src: "/visuals/svg/supply_demand_curve.svg",
  },
  {
    id: "contract-formation-elements",
    title: "Contract Formation Elements",
    category: "Business Law",
    type: "html",
    src: "/visuals/deca/Contract%20Formation%20Elements.dc.html",
  },
  {
    id: "forms-of-business-ownership",
    title: "Forms of Business Ownership",
    category: "Business Law",
    type: "html",
    src: "/visuals/deca/Forms%20of%20Business%20Ownership.dc.html",
  },
  {
    id: "swot-analysis",
    title: "SWOT Analysis",
    category: "Strategy",
    type: "svg",
    src: "/visuals/svg/swot_analysis.svg",
  },
  {
    id: "ansoff-matrix",
    title: "Ansoff Matrix",
    category: "Strategy",
    type: "svg",
    src: "/visuals/svg/ansoff_matrix.svg",
  },
  {
    id: "bcg-matrix",
    title: "BCG Matrix",
    category: "Strategy",
    type: "svg",
    src: "/visuals/svg/bcg_matrix.svg",
  },
  {
    id: "porters-five-forces",
    title: "Porter's Five Forces",
    category: "Strategy",
    type: "svg",
    src: "/visuals/svg/porters_five_forces.svg",
  },
];
