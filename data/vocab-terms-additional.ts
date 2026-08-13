import type { ClusterSlug } from "@/data/vocab-clusters";

type AdditionalVocabTerm = {
  term: string;
  definition: string;
  instructionalAreaCode:
    | "FI"
    | "EC"
    | "MK"
    | "OP"
    | "QM"
    | "EN"
    | "SM"
    | "HR"
    | "PD"
    | "RM"
    | "CR"
    | "PR"
    | "SE";
  clusterSlugs: ClusterSlug[];
};

export const additionalVocabTerms: AdditionalVocabTerm[] = [
  {
    term: "Occupancy Rate",
    definition:
      "The percentage of available rooms or seats that are filled over a given period.",
    instructionalAreaCode: "OP",
    clusterSlugs: ["hospitality-and-tourism", "finance"],
  },
  {
    term: "ADR (Average Daily Rate)",
    definition: "The average revenue earned per occupied hotel room per day.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["hospitality-and-tourism", "finance"],
  },
  {
    term: "RevPAR (Revenue Per Available Room)",
    definition:
      "A hotel performance metric combining occupancy rate and average daily rate.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["hospitality-and-tourism", "finance", "marketing"],
  },
  {
    term: "Concierge",
    definition:
      "A hotel staff member who assists guests with reservations, recommendations, and special requests.",
    instructionalAreaCode: "CR",
    clusterSlugs: ["hospitality-and-tourism", "marketing"],
  },
  {
    term: "Front of House",
    definition:
      "The areas and staff of a hospitality business that interact directly with guests.",
    instructionalAreaCode: "OP",
    clusterSlugs: ["hospitality-and-tourism", "marketing"],
  },
  {
    term: "Back of House",
    definition:
      "The areas and staff of a hospitality business not visible to guests, such as kitchens.",
    instructionalAreaCode: "OP",
    clusterSlugs: ["hospitality-and-tourism"],
  },
  {
    term: "Amenities",
    definition:
      "Features or services offered to enhance guest comfort and satisfaction.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["hospitality-and-tourism", "marketing"],
  },
  {
    term: "Reservation System",
    definition:
      "A tool used to book and manage guest arrivals and room availability.",
    instructionalAreaCode: "OP",
    clusterSlugs: ["hospitality-and-tourism", "marketing", "entrepreneurship"],
  },
  {
    term: "Group Travel",
    definition:
      "Travel arranged for multiple people, often at a discounted rate.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["hospitality-and-tourism", "marketing"],
  },
  {
    term: "Destination Marketing",
    definition: "Promotional efforts to attract visitors to a specific location.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["hospitality-and-tourism", "marketing", "entrepreneurship"],
  },
  {
    term: "Ecotourism",
    definition:
      "Travel focused on visiting natural areas while minimizing environmental impact.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["hospitality-and-tourism", "marketing", "entrepreneurship"],
  },
  {
    term: "All-Inclusive",
    definition:
      "A travel package covering accommodations, meals, and activities for one price.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["hospitality-and-tourism", "marketing", "finance"],
  },
  {
    term: "Yield Management",
    definition:
      "Adjusting prices dynamically based on demand to maximize revenue.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["hospitality-and-tourism", "finance", "marketing"],
  },
  {
    term: "Event Planning",
    definition:
      "The process of organizing and coordinating conferences, weddings, or other gatherings.",
    instructionalAreaCode: "EN",
    clusterSlugs: ["hospitality-and-tourism", "entrepreneurship", "marketing"],
  },
  {
    term: "Culinary Arts",
    definition: "The practice and study of food preparation and cooking.",
    instructionalAreaCode: "OP",
    clusterSlugs: ["hospitality-and-tourism", "entrepreneurship"],
  },
  {
    term: "Food Cost Percentage",
    definition: "The ratio of food costs to food sales revenue.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["hospitality-and-tourism", "finance"],
  },
  {
    term: "Sanitation Standards",
    definition:
      "Health and cleanliness requirements for food service operations.",
    instructionalAreaCode: "QM",
    clusterSlugs: ["hospitality-and-tourism", "business-management-and-administration"],
  },
  {
    term: "Guest Experience",
    definition:
      "The overall impression and satisfaction a customer has during a hospitality interaction.",
    instructionalAreaCode: "CR",
    clusterSlugs: ["hospitality-and-tourism", "marketing"],
  },
  {
    term: "Loyalty Program",
    definition: "A rewards system designed to encourage repeat business.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["hospitality-and-tourism", "marketing", "entrepreneurship"],
  },
  {
    term: "Seasonality",
    definition: "Predictable fluctuations in demand tied to time of year.",
    instructionalAreaCode: "EC",
    clusterSlugs: ["hospitality-and-tourism", "finance", "marketing"],
  },
  {
    term: "Point of Sale (POS)",
    definition: "The location or system where a transaction is completed.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["marketing", "finance", "entrepreneurship"],
  },
  {
    term: "Impulse Buying",
    definition: "An unplanned purchase decision made spontaneously.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["marketing", "entrepreneurship"],
  },
  {
    term: "Cross-Selling",
    definition:
      "Encouraging a customer to buy a related or complementary product.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["marketing", "entrepreneurship"],
  },
  {
    term: "Upselling",
    definition:
      "Encouraging a customer to purchase a more expensive version of a product.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["marketing", "entrepreneurship", "hospitality-and-tourism"],
  },
  {
    term: "Customer Retention",
    definition: "A business's ability to keep customers over time.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["marketing", "business-management-and-administration"],
  },
  {
    term: "Customer Relationship Management (CRM)",
    definition:
      "Strategies and tools used to manage interactions with customers.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["marketing", "business-management-and-administration", "entrepreneurship"],
  },
  {
    term: "Public Relations (PR)",
    definition:
      "Managing the spread of information to shape public perception of a business.",
    instructionalAreaCode: "PR",
    clusterSlugs: ["marketing", "entrepreneurship"],
  },
  {
    term: "Publicity",
    definition: "Unpaid media coverage a business receives.",
    instructionalAreaCode: "PR",
    clusterSlugs: ["marketing", "entrepreneurship"],
  },
  {
    term: "Sales Promotion",
    definition: "Short-term incentives designed to boost sales.",
    instructionalAreaCode: "PR",
    clusterSlugs: ["marketing", "entrepreneurship"],
  },
  {
    term: "Personal Selling",
    definition:
      "Direct, face-to-face communication between a salesperson and a customer.",
    instructionalAreaCode: "SE",
    clusterSlugs: ["marketing", "entrepreneurship"],
  },
  {
    term: "Advertising",
    definition: "Paid, non-personal promotion of a product or service.",
    instructionalAreaCode: "PR",
    clusterSlugs: ["marketing", "entrepreneurship"],
  },
  {
    term: "Media Mix",
    definition: "The combination of advertising channels used in a campaign.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["marketing", "entrepreneurship"],
  },
  {
    term: "Market Research",
    definition: "The systematic gathering of data about consumers and markets.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["marketing", "entrepreneurship", "finance"],
  },
  {
    term: "Focus Group",
    definition: "A small group interviewed to gather opinions on a product or idea.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["marketing", "entrepreneurship"],
  },
  {
    term: "Survey",
    definition: "A research tool used to collect data from a sample of people.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["marketing", "entrepreneurship", "business-management-and-administration"],
  },
  {
    term: "Buyer's Persona",
    definition: "A profile representing a business's ideal customer.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["marketing", "entrepreneurship"],
  },
  {
    term: "Value Proposition",
    definition:
      "A statement explaining why a customer should choose a product or service.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["marketing", "entrepreneurship"],
  },
  {
    term: "Product Placement",
    definition:
      "Featuring a product within media content as a form of promotion.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["marketing", "entrepreneurship"],
  },
  {
    term: "Viral Marketing",
    definition:
      "Promotion that spreads rapidly through sharing, often online.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["marketing", "entrepreneurship"],
  },
  {
    term: "Influencer Marketing",
    definition:
      "Using individuals with an audience to promote products.",
    instructionalAreaCode: "MK",
    clusterSlugs: ["marketing", "entrepreneurship"],
  },
  {
    term: "General Ledger",
    definition: "The master record of all financial transactions in a business.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "entrepreneurship", "business-management-and-administration"],
  },
  {
    term: "Journal Entry",
    definition: "A record of a single financial transaction in accounting.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "entrepreneurship"],
  },
  {
    term: "Trial Balance",
    definition:
      "A report listing all ledger account balances to check accuracy.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "entrepreneurship"],
  },
  {
    term: "Amortization",
    definition: "The gradual repayment of a loan through scheduled payments.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "personal-financial-literacy", "entrepreneurship"],
  },
  {
    term: "Capital Gain",
    definition:
      "The profit earned from selling an asset for more than its purchase price.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "personal-financial-literacy", "entrepreneurship"],
  },
  {
    term: "Capital Loss",
    definition:
      "The loss incurred from selling an asset for less than its purchase price.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "personal-financial-literacy", "entrepreneurship"],
  },
  {
    term: "Diversified Portfolio",
    definition: "A mix of investments designed to reduce overall risk.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "personal-financial-literacy", "entrepreneurship"],
  },
  {
    term: "Mutual Fund",
    definition:
      "A pooled investment fund managed by professionals on behalf of investors.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "personal-financial-literacy", "entrepreneurship"],
  },
  {
    term: "Compound Interest",
    definition:
      "Interest calculated on both the initial principal and accumulated interest.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "personal-financial-literacy"],
  },
  {
    term: "Simple Interest",
    definition: "Interest calculated only on the original principal amount.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "personal-financial-literacy"],
  },
  {
    term: "Credit Score",
    definition: "A numerical rating of an individual's creditworthiness.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "personal-financial-literacy"],
  },
  {
    term: "Debt-to-Income Ratio",
    definition:
      "A measure comparing monthly debt payments to monthly income.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "personal-financial-literacy"],
  },
  {
    term: "Budget",
    definition: "A financial plan estimating income and expenses over a period.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "personal-financial-literacy", "entrepreneurship"],
  },
  {
    term: "Net Worth",
    definition: "The total value of assets minus liabilities.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "personal-financial-literacy", "entrepreneurship"],
  },
  {
    term: "Audit",
    definition: "An official examination of financial records for accuracy.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "business-management-and-administration"],
  },
  {
    term: "Underwriting",
    definition:
      "The process of evaluating and assuming financial risk, often for loans or insurance.",
    instructionalAreaCode: "RM",
    clusterSlugs: ["finance", "entrepreneurship"],
  },
  {
    term: "Premium",
    definition: "The amount paid periodically for an insurance policy.",
    instructionalAreaCode: "RM",
    clusterSlugs: ["finance", "personal-financial-literacy"],
  },
  {
    term: "Deductible",
    definition:
      "The amount an insured party must pay before insurance coverage applies.",
    instructionalAreaCode: "RM",
    clusterSlugs: ["finance", "personal-financial-literacy"],
  },
  {
    term: "Fiduciary",
    definition:
      "A person or entity legally obligated to act in another's best financial interest.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "personal-financial-literacy", "business-management-and-administration"],
  },
  {
    term: "Solvency",
    definition: "A business's ability to meet its long-term financial obligations.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "entrepreneurship"],
  },
  {
    term: "Innovation",
    definition: "The introduction of new ideas, products, or methods.",
    instructionalAreaCode: "EN",
    clusterSlugs: ["entrepreneurship", "marketing", "business-management-and-administration"],
  },
  {
    term: "Disruptive Innovation",
    definition:
      "A new product or service that significantly alters an existing market.",
    instructionalAreaCode: "EN",
    clusterSlugs: ["entrepreneurship", "marketing"],
  },
  {
    term: "Pitch Deck",
    definition:
      "A presentation entrepreneurs use to summarize a business for investors.",
    instructionalAreaCode: "EN",
    clusterSlugs: ["entrepreneurship", "finance"],
  },
  {
    term: "Bootstrapping",
    definition:
      "Starting and growing a business using personal finances rather than outside investment.",
    instructionalAreaCode: "EN",
    clusterSlugs: ["entrepreneurship", "finance"],
  },
  {
    term: "Scalability",
    definition:
      "A business's capacity to grow without being hindered by its structure or resources.",
    instructionalAreaCode: "EN",
    clusterSlugs: ["entrepreneurship", "business-management-and-administration"],
  },
  {
    term: "Pivot",
    definition: "A significant change in business strategy or direction.",
    instructionalAreaCode: "EN",
    clusterSlugs: ["entrepreneurship", "marketing"],
  },
  {
    term: "Minimum Viable Product (MVP)",
    definition:
      "A basic version of a product used to test market interest.",
    instructionalAreaCode: "EN",
    clusterSlugs: ["entrepreneurship", "marketing"],
  },
  {
    term: "Crowdfunding",
    definition:
      "Raising small amounts of money from many people, often online.",
    instructionalAreaCode: "EN",
    clusterSlugs: ["entrepreneurship", "finance", "marketing"],
  },
  {
    term: "Exit Strategy",
    definition:
      "A plan for how an owner will eventually leave or sell a business.",
    instructionalAreaCode: "EN",
    clusterSlugs: ["entrepreneurship", "finance"],
  },
  {
    term: "Succession Planning",
    definition:
      "Preparing for the transition of leadership within a business.",
    instructionalAreaCode: "HR",
    clusterSlugs: ["entrepreneurship", "business-management-and-administration"],
  },
  {
    term: "Strategic Planning",
    definition:
      "The process of defining a business's direction and allocating resources to pursue it.",
    instructionalAreaCode: "SM",
    clusterSlugs: ["entrepreneurship", "business-management-and-administration"],
  },
  {
    term: "Mission Statement",
    definition: "A declaration of a company's core purpose.",
    instructionalAreaCode: "SM",
    clusterSlugs: ["entrepreneurship", "business-management-and-administration", "marketing"],
  },
  {
    term: "Vision Statement",
    definition: "A statement describing a company's long-term aspirations.",
    instructionalAreaCode: "SM",
    clusterSlugs: ["entrepreneurship", "business-management-and-administration"],
  },
  {
    term: "Core Values",
    definition: "The fundamental beliefs guiding an organization's behavior.",
    instructionalAreaCode: "SM",
    clusterSlugs: ["entrepreneurship", "business-management-and-administration", "marketing"],
  },
  {
    term: "Change Management",
    definition: "The process of guiding an organization through transitions.",
    instructionalAreaCode: "SM",
    clusterSlugs: ["business-management-and-administration", "entrepreneurship"],
  },
  {
    term: "Conflict Resolution",
    definition: "Methods used to resolve disagreements within an organization.",
    instructionalAreaCode: "HR",
    clusterSlugs: ["business-management-and-administration", "entrepreneurship"],
  },
  {
    term: "Team Building",
    definition: "Activities designed to improve collaboration among employees.",
    instructionalAreaCode: "HR",
    clusterSlugs: ["business-management-and-administration", "entrepreneurship"],
  },
  {
    term: "Motivation",
    definition:
      "The internal drive that influences employee behavior and performance.",
    instructionalAreaCode: "PD",
    clusterSlugs: ["business-management-and-administration", "entrepreneurship", "marketing"],
  },
  {
    term: "Employee Empowerment",
    definition: "Giving employees authority and confidence to make decisions.",
    instructionalAreaCode: "HR",
    clusterSlugs: ["business-management-and-administration", "entrepreneurship"],
  },
  {
    term: "Work-Life Balance",
    definition:
      "The equilibrium between professional responsibilities and personal life.",
    instructionalAreaCode: "HR",
    clusterSlugs: ["business-management-and-administration", "entrepreneurship"],
  },
  {
    term: "Opportunity Cost",
    definition:
      "The value of the next best alternative given up when making a choice.",
    instructionalAreaCode: "EC",
    clusterSlugs: ["finance", "personal-financial-literacy", "entrepreneurship"],
  },
  {
    term: "Scarcity",
    definition:
      "The basic economic problem of limited resources versus unlimited wants.",
    instructionalAreaCode: "EC",
    clusterSlugs: ["finance", "personal-financial-literacy", "marketing"],
  },
  {
    term: "Command Economy",
    definition:
      "An economic system where the government controls production and pricing.",
    instructionalAreaCode: "EC",
    clusterSlugs: ["finance", "business-management-and-administration"],
  },
  {
    term: "Market Economy",
    definition:
      "An economic system driven by supply, demand, and private ownership.",
    instructionalAreaCode: "EC",
    clusterSlugs: ["finance", "entrepreneurship", "marketing"],
  },
  {
    term: "Mixed Economy",
    definition:
      "An economic system combining elements of market and command economies.",
    instructionalAreaCode: "EC",
    clusterSlugs: ["finance", "entrepreneurship"],
  },
  {
    term: "Fiscal Year",
    definition:
      "A 12-month period used for financial reporting, not necessarily aligned with the calendar year.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["finance", "business-management-and-administration"],
  },
  {
    term: "National Debt",
    definition: "The total amount of money a government owes to creditors.",
    instructionalAreaCode: "EC",
    clusterSlugs: ["finance", "personal-financial-literacy"],
  },
  {
    term: "Unemployment Rate",
    definition:
      "The percentage of the labor force actively seeking but unable to find work.",
    instructionalAreaCode: "EC",
    clusterSlugs: ["finance", "business-management-and-administration"],
  },
  {
    term: "Consumer Price Index (CPI)",
    definition:
      "A measure of the average change in prices paid by consumers over time.",
    instructionalAreaCode: "EC",
    clusterSlugs: ["finance", "personal-financial-literacy"],
  },
  {
    term: "Progressive Tax",
    definition: "A tax system where rates increase as income increases.",
    instructionalAreaCode: "EC",
    clusterSlugs: ["finance", "personal-financial-literacy"],
  },
  {
    term: "Regressive Tax",
    definition:
      "A tax system where lower-income individuals pay a higher percentage of income.",
    instructionalAreaCode: "EC",
    clusterSlugs: ["finance", "personal-financial-literacy"],
  },
  {
    term: "Emergency Fund",
    definition: "Savings set aside to cover unexpected expenses.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["personal-financial-literacy", "finance"],
  },
  {
    term: "Identity Theft",
    definition:
      "The fraudulent use of someone's personal information for financial gain.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["personal-financial-literacy", "finance"],
  },
  {
    term: "APR (Annual Percentage Rate)",
    definition:
      "The yearly cost of borrowing, expressed as a percentage.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["personal-financial-literacy", "finance"],
  },
  {
    term: "Financial Literacy",
    definition:
      "The knowledge and skills needed to make informed financial decisions.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["personal-financial-literacy", "finance", "entrepreneurship"],
  },
  {
    term: "Direct Deposit",
    definition: "Electronic transfer of funds directly into a bank account.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["personal-financial-literacy", "finance"],
  },
  {
    term: "Overdraft",
    definition: "Withdrawing more money from an account than it holds.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["personal-financial-literacy", "finance"],
  },
  {
    term: "W-2 Form",
    definition:
      "A U.S. tax document reporting an employee's annual wages and withheld taxes.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["personal-financial-literacy", "finance", "business-management-and-administration"],
  },
  {
    term: "1099 Form",
    definition:
      "A U.S. tax document reporting income earned outside of traditional employment.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["personal-financial-literacy", "finance", "entrepreneurship"],
  },
  {
    term: "Estate Planning",
    definition:
      "The process of arranging how one's assets will be managed and distributed after death.",
    instructionalAreaCode: "FI",
    clusterSlugs: ["personal-financial-literacy", "finance"],
  },
];
