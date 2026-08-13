import type { ClusterSlug } from "@/data/vocab-clusters";
import { additionalVocabTerms } from "@/data/vocab-terms-additional";

export type VocabTerm = {
  term: string;
  definition: string;
  instructionalAreaCode:
    | "FI"
    | "EC"
    | "MK"
    | "DS"
    | "OP"
    | "QM"
    | "EN"
    | "SM"
    | "BL"
    | "HR"
    | "PD"
    | "RM"
    | "PM"
    | "CO"
    | "CR"
    | "PR"
    | "SE"
    | "UN";
  /** Optional explicit cluster tags when a term spans clusters beyond its IA defaults. */
  clusterSlugs?: ClusterSlug[];
};

const baseVocabTerms: VocabTerm[] = [
  {
    term: "Asset",
    definition: "Anything of value a business owns.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Liability",
    definition: "A debt or obligation a business owes.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Equity",
    definition:
      "The owner's claim on business assets after liabilities are subtracted.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Revenue",
    definition: "Income generated from normal business operations.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Net Income",
    definition: "Profit remaining after all expenses are subtracted from revenue.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Gross Profit",
    definition: "Revenue minus cost of goods sold.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Balance Sheet",
    definition:
      "A financial statement showing assets, liabilities, and equity at a point in time.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Income Statement",
    definition:
      "A financial statement showing revenue and expenses over a period.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Cash Flow",
    definition: "The movement of money into and out of a business.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Working Capital",
    definition: "Current assets minus current liabilities.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Depreciation",
    definition: "The gradual decrease in value of an asset over time.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Liquidity",
    definition: "How easily an asset can be converted to cash.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Accounts Receivable",
    definition: "Money owed to a business by its customers.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Accounts Payable",
    definition: "Money a business owes to its suppliers.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Break-Even Point",
    definition: "The sales level at which total revenue equals total costs.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Fixed Costs",
    definition: "Expenses that stay constant regardless of production level.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Variable Costs",
    definition: "Expenses that change with production level.",
    instructionalAreaCode: "FI",
  },
  {
    term: "ROI (Return on Investment)",
    definition:
      "A measure of profitability relative to the cost of an investment.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Capital",
    definition: "Financial resources used to fund business operations or growth.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Interest Rate",
    definition: "The cost of borrowing money, expressed as a percentage.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Diversification",
    definition:
      "Spreading investments or business activities to reduce risk.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Collateral",
    definition: "Property pledged to secure a loan.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Credit",
    definition:
      "The ability to obtain goods or money before payment, based on trust.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Debit",
    definition: "An entry recording money owed or an increase in assets.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Dividend",
    definition: "A portion of company profit distributed to shareholders.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Stock",
    definition: "A share of ownership in a corporation.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Bond",
    definition: "A debt security issued by a company or government.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Portfolio",
    definition: "A collection of financial investments.",
    instructionalAreaCode: "FI",
  },
  {
    term: "Inflation",
    definition:
      "A general rise in prices over time, reducing purchasing power.",
    instructionalAreaCode: "EC",
  },
  {
    term: "Recession",
    definition:
      "A significant decline in economic activity over a sustained period.",
    instructionalAreaCode: "EC",
  },
  {
    term: "Supply",
    definition: "The quantity of a good or service producers are willing to sell.",
    instructionalAreaCode: "EC",
  },
  {
    term: "Demand",
    definition:
      "The quantity of a good or service consumers are willing to buy.",
    instructionalAreaCode: "EC",
  },
  {
    term: "Market Equilibrium",
    definition: "The price point where supply equals demand.",
    instructionalAreaCode: "EC",
  },
  {
    term: "Monopoly",
    definition: "A market structure with a single seller controlling supply.",
    instructionalAreaCode: "EC",
  },
  {
    term: "Competition",
    definition: "Rivalry among businesses for customers and market share.",
    instructionalAreaCode: "EC",
  },
  {
    term: "Market Share",
    definition:
      "A company's sales as a percentage of total industry sales.",
    instructionalAreaCode: "MK",
  },
  {
    term: "Target Market",
    definition: "The specific group of consumers a business aims to reach.",
    instructionalAreaCode: "MK",
  },
  {
    term: "Market Segmentation",
    definition:
      "Dividing a market into distinct groups based on shared characteristics.",
    instructionalAreaCode: "MK",
  },
  {
    term: "Demographics",
    definition:
      "Statistical data about a population, such as age or income.",
    instructionalAreaCode: "MK",
  },
  {
    term: "Psychographics",
    definition: "Data about consumers' attitudes, values, and lifestyles.",
    instructionalAreaCode: "MK",
  },
  {
    term: "Branding",
    definition: "The process of creating a unique identity for a product or company.",
    instructionalAreaCode: "MK",
  },
  {
    term: "Brand Loyalty",
    definition:
      "A consumer's consistent preference for one brand over competitors.",
    instructionalAreaCode: "MK",
  },
  {
    term: "Positioning",
    definition:
      "How a product is perceived relative to competitors in customers' minds.",
    instructionalAreaCode: "MK",
  },
  {
    term: "Marketing Mix",
    definition:
      "The combination of product, price, place, and promotion strategies.",
    instructionalAreaCode: "MK",
  },
  {
    term: "Product Life Cycle",
    definition: "The stages a product goes through from introduction to decline.",
    instructionalAreaCode: "PM",
  },
  {
    term: "Distribution Channel",
    definition: "The path a product takes from producer to consumer.",
    instructionalAreaCode: "DS",
  },
  {
    term: "Wholesaler",
    definition: "A business that buys goods in bulk to resell to retailers.",
    instructionalAreaCode: "DS",
  },
  {
    term: "Retailer",
    definition: "A business that sells goods directly to consumers.",
    instructionalAreaCode: "DS",
  },
  {
    term: "E-commerce",
    definition: "Buying and selling goods or services over the internet.",
    instructionalAreaCode: "MK",
  },
  {
    term: "Supply Chain",
    definition: "The network involved in producing and delivering a product.",
    instructionalAreaCode: "OP",
  },
  {
    term: "Inventory",
    definition: "Goods held by a business for the purpose of resale.",
    instructionalAreaCode: "OP",
  },
  {
    term: "Just-In-Time (JIT)",
    definition:
      "An inventory strategy that minimizes stock by ordering as needed.",
    instructionalAreaCode: "OP",
  },
  {
    term: "Quality Control",
    definition: "The process of ensuring products meet established standards.",
    instructionalAreaCode: "QM",
  },
  {
    term: "Outsourcing",
    definition: "Contracting business functions to an external party.",
    instructionalAreaCode: "OP",
  },
  {
    term: "Franchise",
    definition:
      "A license allowing an individual to operate a business using another company's brand.",
    instructionalAreaCode: "EN",
  },
  {
    term: "Entrepreneur",
    definition:
      "A person who starts and runs a business, assuming financial risk.",
    instructionalAreaCode: "EN",
  },
  {
    term: "Startup",
    definition:
      "A newly established business, typically in its early stages of development.",
    instructionalAreaCode: "EN",
  },
  {
    term: "Venture Capital",
    definition:
      "Funding provided to startups with high growth potential in exchange for equity.",
    instructionalAreaCode: "EN",
  },
  {
    term: "Angel Investor",
    definition:
      "An individual who provides capital for a startup in exchange for ownership equity.",
    instructionalAreaCode: "EN",
  },
  {
    term: "Business Plan",
    definition: "A formal document outlining a company's goals and strategy.",
    instructionalAreaCode: "EN",
  },
  {
    term: "SWOT Analysis",
    definition:
      "An evaluation of a business's strengths, weaknesses, opportunities, and threats.",
    instructionalAreaCode: "SM",
  },
  {
    term: "Competitive Advantage",
    definition: "A factor that allows a company to outperform its rivals.",
    instructionalAreaCode: "SM",
  },
  {
    term: "Economies of Scale",
    definition: "Cost advantages gained as production increases.",
    instructionalAreaCode: "EC",
  },
  {
    term: "Sole Proprietorship",
    definition: "A business owned and operated by one individual.",
    instructionalAreaCode: "BL",
  },
  {
    term: "Partnership",
    definition: "A business owned by two or more individuals.",
    instructionalAreaCode: "BL",
  },
  {
    term: "Corporation",
    definition:
      "A legal entity separate from its owners, offering limited liability.",
    instructionalAreaCode: "BL",
  },
  {
    term: "Limited Liability",
    definition:
      "Protection that limits an owner's financial risk to their investment in the business.",
    instructionalAreaCode: "BL",
  },
  {
    term: "Shareholder",
    definition: "A person who owns shares in a corporation.",
    instructionalAreaCode: "BL",
  },
  {
    term: "Board of Directors",
    definition: "A group elected to oversee a corporation's management and policies.",
    instructionalAreaCode: "BL",
  },
  {
    term: "Corporate Governance",
    definition: "The system of rules and practices directing a corporation.",
    instructionalAreaCode: "BL",
  },
  {
    term: "Human Resources",
    definition:
      "The department managing employee recruitment, training, and relations.",
    instructionalAreaCode: "HR",
  },
  {
    term: "Recruitment",
    definition: "The process of attracting and selecting candidates for a job.",
    instructionalAreaCode: "HR",
  },
  {
    term: "Onboarding",
    definition: "The process of integrating a new employee into a company.",
    instructionalAreaCode: "HR",
  },
  {
    term: "Performance Appraisal",
    definition: "A formal review of an employee's job performance.",
    instructionalAreaCode: "HR",
  },
  {
    term: "Delegation",
    definition: "Assigning responsibility and authority to others.",
    instructionalAreaCode: "HR",
  },
  {
    term: "Leadership",
    definition: "The ability to guide and influence others toward a goal.",
    instructionalAreaCode: "PD",
  },
  {
    term: "Management",
    definition:
      "The process of planning, organizing, leading, and controlling resources.",
    instructionalAreaCode: "SM",
  },
  {
    term: "Organizational Structure",
    definition:
      "The formal arrangement of roles and responsibilities within a company.",
    instructionalAreaCode: "HR",
  },
  {
    term: "Span of Control",
    definition: "The number of employees a manager directly supervises.",
    instructionalAreaCode: "HR",
  },
  {
    term: "Chain of Command",
    definition: "The line of authority within an organization.",
    instructionalAreaCode: "HR",
  },
  {
    term: "Ethics",
    definition: "Moral principles that guide behavior and decision-making.",
    instructionalAreaCode: "BL",
  },
  {
    term: "Corporate Social Responsibility (CSR)",
    definition:
      "A business's commitment to ethical and sustainable practices.",
    instructionalAreaCode: "BL",
  },
  {
    term: "Sustainability",
    definition:
      "Meeting present needs without compromising future resources.",
    instructionalAreaCode: "UN",
  },
  {
    term: "Compliance",
    definition: "Adherence to laws, regulations, and internal policies.",
    instructionalAreaCode: "BL",
  },
  {
    term: "Risk Management",
    definition:
      "The process of identifying and mitigating potential threats to a business.",
    instructionalAreaCode: "RM",
  },
  {
    term: "Insurance",
    definition: "A contract providing financial protection against specified risks.",
    instructionalAreaCode: "RM",
  },
  {
    term: "Negotiation",
    definition: "A discussion aimed at reaching a mutually acceptable agreement.",
    instructionalAreaCode: "CO",
  },
  {
    term: "Contract",
    definition: "A legally binding agreement between two or more parties.",
    instructionalAreaCode: "BL",
  },
  {
    term: "Intellectual Property",
    definition:
      "Legal rights protecting creations of the mind, such as inventions or trademarks.",
    instructionalAreaCode: "BL",
  },
  {
    term: "Trademark",
    definition:
      "A symbol or name legally registered to represent a company or product.",
    instructionalAreaCode: "BL",
  },
  {
    term: "Patent",
    definition:
      "A government-granted right protecting an invention from unauthorized use.",
    instructionalAreaCode: "BL",
  },
  {
    term: "Copyright",
    definition: "Legal protection for original creative works.",
    instructionalAreaCode: "BL",
  },
  {
    term: "Globalization",
    definition:
      "The increasing interconnection of economies and businesses worldwide.",
    instructionalAreaCode: "EC",
  },
  {
    term: "Exchange Rate",
    definition: "The value of one currency in terms of another.",
    instructionalAreaCode: "EC",
  },
  {
    term: "Tariff",
    definition: "A tax imposed on imported or exported goods.",
    instructionalAreaCode: "EC",
  },
  {
    term: "Trade Deficit",
    definition: "When a country imports more than it exports.",
    instructionalAreaCode: "EC",
  },
  {
    term: "Gross Domestic Product (GDP)",
    definition:
      "The total value of goods and services produced in a country.",
    instructionalAreaCode: "EC",
  },
  {
    term: "Fiscal Policy",
    definition:
      "Government use of spending and taxation to influence the economy.",
    instructionalAreaCode: "EC",
  },
  {
    term: "Monetary Policy",
    definition:
      "Central bank actions that manage the money supply and interest rates.",
    instructionalAreaCode: "EC",
  },
  {
    term: "Productivity",
    definition:
      "The efficiency of production, measured by output per unit of input.",
    instructionalAreaCode: "EC",
  },
];

export const vocabTerms: VocabTerm[] = [
  ...baseVocabTerms,
  ...additionalVocabTerms,
];
