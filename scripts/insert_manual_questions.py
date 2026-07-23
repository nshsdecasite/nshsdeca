#!/usr/bin/env python3
"""Insert manually provided missing exam questions into testbank tables."""

from __future__ import annotations

import json
import sys
import uuid
from dataclasses import dataclass, field
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from exam_parser import (
    IA_NAMES,
    ParsedChoice,
    ParsedQuestion,
    ia_code_from_pi,
    normalize_lap_code,
    normalize_pi_code,
)
from load_exams_to_db import (
    FALLBACK_IA_CODE,
    FALLBACK_PI_CODE,
    ExamLoadPlan,
    pi_display_order,
    sql_literal,
    stable_id,
)

ROOT = Path(__file__).resolve().parents[1]
OUT_SQL = ROOT / "data" / "exams" / "manual_missing_questions.sql"


@dataclass
class ManualQuestion:
    exam_code: str
    number: int
    stem: str
    choices: dict[str, str]
    correct_label: str
    rationale: str
    pi_code: str
    pi_text: str | None = None
    lap_code: str | None = None
    lap_title: str | None = None
    source_citations: list[str] = field(default_factory=list)


MANUAL_QUESTIONS = [
    ManualQuestion(
        exam_code="bac-2017",
        number=18,
        stem="It is important for employees to demonstrate a customer-service mindset when they are",
        choices={
            "A": "handling problems.",
            "B": "contacting suppliers.",
            "C": "placing orders.",
            "D": "preparing schedules.",
        },
        correct_label="A",
        rationale=(
            "Handling problems. Problems and complaints should not be avoided but looked at as opportunities to "
            "demonstrate a customer-service mindset. Most customers will tell others about problems they have with "
            "the business, but they will also tell how quickly and satisfactorily their problems or complaints were "
            "resolved. These customers will likely return to the business, in spite of previous problems, because they "
            "know employees will resolve whatever problems arise. Employees do not need to demonstrate a "
            "customer-service mindset when placing orders, contacting suppliers, and preparing schedules because "
            "customers are not involved in these situations."
        ),
        pi_code="CR:004",
        lap_code="LAP-CR-004",
        lap_title="Set Your Mind to It (Customer-Service Mindset)",
    ),
    ManualQuestion(
        exam_code="bac-2018",
        number=53,
        stem=(
            "What federal law must businesses follow when they offer revolving charge accounts and send customers "
            "updated statements showing the status of their accounts?"
        ),
        choices={
            "A": "Fair Credit Billing Act",
            "B": "Equal Credit Opportunity Act",
            "C": "Truth-in-Lending Act",
            "D": "Fair and Accurate Credit Transactions Act",
        },
        correct_label="C",
        rationale=(
            "Truth-in-Lending Act. The Truth-in-Lending Act requires businesses to provide credit customers with all "
            "the information that applies to their accounts and send customers regularly updated statements showing "
            "the status of their accounts. The purpose of the Equal Credit Opportunity Act is to make the granting of "
            "credit fair by prohibiting the denial of credit based on the applicant's gender, race, age, marital status, or "
            "national origin. The Fair Credit Billing Act requires businesses that extend credit to respond within 30 "
            "days to any customer's complaint or inquiry about a billing error. The Fair and Accurate Credit "
            "Transactions Act gives consumers the right to inspect the files of their credit history at any credit agency "
            "and to have any mistakes corrected."
        ),
        pi_code="FI:002",
        lap_code="LAP-FI-002",
        lap_title="Give Credit Where Credit Is Due (Credit and Its Importance)",
    ),
    ManualQuestion(
        exam_code="bma-2017",
        number=52,
        stem=(
            "Bobbi is searching the Internet for information about business licenses. Unfortunately, many of the "
            "search results are useless to her because they focus on drivers' licenses. What search terms should "
            "Bobbi use to find information specifically about business licenses?"
        ),
        choices={
            "A": '"business license" driver',
            "B": "+business +license",
            "C": "+business +license -driver",
            "D": "BUSINESS LICENSE",
        },
        correct_label="C",
        rationale=(
            "+business +license -driver. By placing a \"+\" before a word, you can tell most search engines to look for "
            "websites containing that word. Likewise, by placing a \"-\" before a word, you are telling the search engine "
            "to disregard all websites that contain that word. So, by entering \"+business +license -driver,\" Bobbi is "
            "telling her search engine to look for websites that contain the words \"business\" and \"license\" but don't "
            "contain the word \"driver.\" That way, Bobbi won't have to weed through search results focusing on drivers' "
            "licenses before finding quality information about business licenses. \"+business +license\" would tell the "
            "search engine to look for websites containing \"business\" and \"license,\" but websites about drivers' "
            "licenses could potentially appear in the search results. The search phrase \"'business license' driver\" "
            "would command the search engine to look for websites that contain the exact phrase \"business license\" "
            "as well as the word \"driver.\" Search engines are not typically case-sensitive, so capitalizing the words "
            "\"BUSINESS LICENSE\" would not have an impact on search results."
        ),
        pi_code="NF:006",
        source_citations=[
            "Shah, D. (2015, November 24). How to search on Google: 31 advanced Google search tips. "
            "Retrieved September 15, 2016, from http://blog.hubspot.com/blog/tabid/6307/bid/1264/12-"
            "Quick-Tips-To-Search-Google-Like-An-Expert.aspx#sm.000013bb971vctfbizbupvslthjnl"
        ],
    ),
    ManualQuestion(
        exam_code="bma-2018",
        number=43,
        stem=(
            "If the cash from operating activities is consistently greater than the company's net income, the company's "
            "net earnings are of a(n) __________ quality."
        ),
        choices={"A": "high", "B": "low", "C": "moderate", "D": "excessive"},
        correct_label="A",
        rationale=(
            "High. The cash from operating activities is compared to the company's net income. If the cash from "
            "operating activities is consistently greater than the net income, the company's net income or earnings are "
            "said to be of a high quality."
        ),
        pi_code="FI:541",
        source_citations=[
            "AccountingCoach. (2004-2017). Cash flow statement (explanation). Retrieved September "
            "13, 2017, from http://www.accountingcoach.com/cash-flow-statement/explanation"
        ],
    ),
    ManualQuestion(
        exam_code="entrepreneurship-2019",
        number=16,
        stem=(
            "Ali wants to negotiate with her boss to take on more job responsibilities. Before approaching her boss, Ali "
            "needs to determine her boss's position and"
        ),
        choices={"A": "abilities.", "B": "interests.", "C": "standards.", "D": "procedures."},
        correct_label="B",
        rationale=(
            "Interests. The key to successful negotiation is to focus on interests. Interests are the things that you and "
            "the other party want or need. You must consider the other party's interests as well as your own. Ability is "
            "a skill someone uses to perform a task through knowledge, training, and practice. When negotiating, one "
            "party may not necessarily know the other party's skills. Standards are specifications or statements that "
            "are used as a basis for comparing or judging goods or services. Procedure refers to the step-by-step "
            "process someone follows when performing a specific task."
        ),
        pi_code="EI:062",
        lap_code="LAP-EI-062",
        lap_title="Make It a Win-Win (Negotiation in Business)",
    ),
    ManualQuestion(
        exam_code="finance-2019",
        number=68,
        stem="Marketing encourages people from different countries to __________ frequently.",
        choices={"A": "train", "B": "trade", "C": "think", "D": "travel"},
        correct_label="B",
        rationale=(
            "Trade. Since marketing creates exchanges between people and nations, it encourages people from "
            "different countries to trade frequently. Traveling, training, and thinking are reputable activities, but they "
            "are not specifically encouraged by marketing."
        ),
        pi_code="MK:001",
        lap_code="LAP-MK-004",
        lap_title="Have It Your Way! (Nature of Marketing)",
    ),
    ManualQuestion(
        exam_code="finance-2019",
        number=78,
        stem=(
            "The most important reason why workplace accidents which do not result in injuries should be reported to "
            "supervisors is because"
        ),
        choices={
            "A": "the next accident could result in an injury.",
            "B": "this is required by state law.",
            "C": "the report prevents future liability.",
            "D": "this is an OSHA requirement.",
        },
        correct_label="A",
        rationale=(
            "The next accident could result in an injury. The fact that one accident does not result in an injury does not "
            "ensure that the next accident will have the same results. An accident that does not cause an injury "
            "should be reported to a supervisor so that the circumstances causing the accident can be corrected if "
            "possible. This may save someone else from injury. Government regulations vary from state to state and "
            "for different industries. Reporting an uninjurious accident does not prevent future liability."
        ),
        pi_code="OP:009",
        source_citations=[
            "Clark, B., Basteri C.G., Gassen, C., & Walker, M. (2014). Marketing dynamics (3rd ed.) [pp. "
            "565-566]. Tinley Park, IL: The Goodheart-Willcox Co."
        ],
    ),
    ManualQuestion(
        exam_code="hospitality-2018",
        number=48,
        stem=(
            "A business comparing the monthly bank statement with the entries in its checkbook is an example of a(n)"
        ),
        choices={
            "A": "break-even analysis.",
            "B": "accounts-payable system.",
            "C": "money-handling technique.",
            "D": "cash-control procedure.",
        },
        correct_label="D",
        rationale=(
            "Cash-control procedure. Businesses develop procedures to control cash in order to prevent loss. One "
            "procedure involves carefully comparing the monthly bank statement with the entries in the business's "
            "checkbook. If a business discovers errors or discrepancies, it should review the statement with the bank "
            "to identify the source of the problem. In some cases, banks accidentally debit the wrong account or post "
            "deposits to the wrong account. If the business fails to detect the error, it may lose those funds. Accounts "
            "payable are all the monies owed by the business to others. Money handling involves accepting cash, "
            "counting change, etc. Break-even analysis is a financial analysis whose purpose is to identify the level of "
            "sales needed to reach the break-even point at various prices."
        ),
        pi_code="FI:113",
        source_citations=[
            "Ann, L. (2009, April 30). Importance of cash control. Retrieved September 12, 2017, from "
            "http://ezinearticles.com/?Importance-Of-Cash-Control&id=2287169"
        ],
    ),
    ManualQuestion(
        exam_code="hospitality-2019",
        number=14,
        stem="Which of the following is an example of a customer service situation related to fraud:",
        choices={
            "A": "A company treats customers differently based on their races.",
            "B": "A customer feels insulted by a server and wants him/her to be fired.",
            "C": "A staff member is stealing food from the kitchen.",
            "D": "A customer lies about the condition of his/her hotel room to get a discount.",
        },
        correct_label="D",
        rationale=(
            "A customer lies about the condition of his/her hotel room to get a discount. Sometimes, customers will act "
            "fraudulently for personal gain, which can cause customer service issues. Customers who lie about the "
            "quality of their experiences to get discounts are committing fraud. Feeling insulted and wanting an "
            "employee fired is not necessarily related to fraud. Staff members stealing food from the kitchen and "
            "companies treating customers differently based on their races are not customer service situations related "
            "to fraud."
        ),
        pi_code="CR:048",
        source_citations=[
            "Astute. (2016, May 6). Goodwill abuse: How customer fraud can cost you big. Retrieved "
            "September 12, 2018, from https://www.astutesolutions.com/blog/articles/goodwill-abusehow-customer-fraud-can-cost-you-big"
        ],
    ),
    ManualQuestion(
        exam_code="hospitality-2026",
        number=81,
        stem=(
            "John's office recently ran out of printer paper. As the employee in charge of ordering office supplies, John called "
            "up the paper supplier and asked them to send the office 100 reams of paper. When the order arrived a few days "
            "later, however, John noticed that his company only received 80 reams instead of 100. When he called the "
            "supplier to complain, the agent argued that John asked for 80 reams--even though John knows he asked for "
            "100. What could John have done to prevent this miscommunication?"
        ),
        choices={
            "A": "Completed a purchase order",
            "B": "Asked for a smaller quantity",
            "C": "Requested the order the same day",
            "D": "Sent the company an invoice",
        },
        correct_label="A",
        rationale=(
            "Completed a purchase order. A purchase order is a formal, written request for a product or service. Purchase "
            "orders generally include all of the specifications of the order, such as the amount of product requested, the "
            "price of the products requested, and the contact information for both buyer and seller. Completing a purchase "
            "order would have prevented this miscommunication between John's office and the paper supplier. John should "
            "not have sent an invoice to the paper supplier. Invoices are sent to businesses that owe money for purchases "
            "they already made. Asking for a smaller quantity or requesting the order the same day would not necessarily "
            "have reduced the chance of miscommunication between John and the paper supplier."
        ),
        pi_code="OP:250",
        pi_text="Describe types of purchase orders",
        source_citations=[
            "Loi, K. (2025, June 11). Purchase orders: All you ever need to know. Retrieved August 15, 2025, "
            "from https://www.procurify.com/blog/purchase-orders-all-you-need-to-know/"
        ],
    ),
    ManualQuestion(
        exam_code="marketing-2019",
        number=31,
        stem="What often increases when a person continually resists change or fails to adapt to new circumstances?",
        choices={
            "A": "Inability to use logic",
            "B": "Feelings of contentment",
            "C": "Sense of accomplishment",
            "D": "Levels of stress",
        },
        correct_label="D",
        rationale=(
            "Levels of stress. Stress is a mental, physical, or emotional feeling of pressure or tension. Adaptability is "
            "the ability to adjust or modify attitudes and/or behavior to new situations or circumstances. When people "
            "are not willing to adapt to new situations, they often feel higher levels of stress. Fighting or ignoring new "
            "circumstances can increase stress, which can harm a person's health and well-being. Resisting change "
            "does not necessarily affect an individual's ability to reason or use logic. When a person learns how to "
            "adapt to change, s/he may feel content or a sense of accomplishment by accepting the change. Being "
            "adaptable often helps a person to relax, which can facilitate creative thinking and learning."
        ),
        pi_code="EI:006",
        lap_code="LAP-EI-023",
        lap_title="Go With the Flow (Demonstrating Adaptability)",
    ),
    ManualQuestion(
        exam_code="marketing-2019",
        number=98,
        stem=(
            "Which of the following is an example of a salesperson describing a product's construction and materials:"
        ),
        choices={
            "A": '"Many of my customers have owned and used this product for more than 10 years."',
            "B": "“To accommodate your décor, this product is available in a variety of finishes and colors.”",
            "C": "“Another feature about this item is that it can also be used in several ways.”",
            "D": '"Because the manufacturer uses high-grade materials to produce this item, its quality is superior."',
        },
        correct_label="D",
        rationale=(
            "\"Because the manufacturer uses high-grade materials to produce this item, its quality is superior.\" To "
            "influence the customer's buying decision, the salesperson must describe the product features and "
            "benefits to the customer. One feature that the salesperson might describe is the product's construction. "
            "This involves telling the customer about the materials and processes used to make the product. This "
            "technique is often used to emphasize the product's high quality. A salesperson describing the product's "
            "finishes and colors is pointing out features about appearance and style. If a customer can use the "
            "product in many ways, the salesperson is emphasizing the product's uses. Pointing out the length of time "
            "that past customers have owned and used the product is emphasizing the item's durability."
        ),
        pi_code="SE:109",
        lap_code="LAP-SE-113",
        lap_title="Find Features, Boost Benefits (Feature-Benefit Selling)",
    ),
    ManualQuestion(
        exam_code="pfl-2017",
        number=28,
        stem="What source of credit buys borrowers' contracts from sellers?",
        choices={
            "A": "Sales finance companies",
            "B": "Commercial banks",
            "C": "Credit unions",
            "D": "Savings and loan associations",
        },
        correct_label="A",
        rationale=(
            "Sales finance companies. After a sales finance company buys borrowers' contracts from sellers, the "
            "borrowers make their payments to the sales finance company. The sales finance company retains a legal "
            "interest in the items purchased until all payments are completed. Commercial banks are full-service "
            "financial institutions that offer checking and savings accounts, secured and unsecured loans, installment "
            "credit, and bank credit cards. Savings and loan associations are financial institutions that offer savings "
            "accounts and make loans to borrowers. Many of their loans are for real estate purchases. Credit unions "
            "are financial cooperatives set up to provide savings and credit services to their members."
        ),
        pi_code="FI:002",
        lap_code="LAP-FI-002",
        lap_title="Give Credit Where Credit Is Due (Credit and Its Importance)",
    ),
    ManualQuestion(
        exam_code="pfl-2018",
        number=56,
        stem="What does diversification by cap-size help investors to do?",
        choices={
            "A": "Avoid buying too many investments in one category",
            "B": "Update their investment portfolios",
            "C": "Protect their investments from a negative event",
            "D": "Spread out the growth rates of their investments",
        },
        correct_label="D",
        rationale=(
            "Spread out the growth rates of their investments. Diversifying by cap-size will help you spread out the "
            "growth rates of your investments. Each company fits into a cap-size category, either small, large, or mid "
            "(for medium), according to its market capitalization. By spreading out investment risk, diversification, in "
            "general, protects your portfolio from a negative event. One way to diversify is to avoid buying too many "
            "investments in one category. Updating your investment portfolio helps you stay on track with your "
            "investment goals and risk tolerance."
        ),
        pi_code="FI:283",
        source_citations=[
            "Ross, K. (2016, July 18). Market capitalization and a diversified portfolio. Retrieved "
            "September 25, 2017, from https://library.wilmingtontrust.com/investmentmanagement/market-capitalization-and-a-diversified-portfolio"
        ],
    ),
]


def to_parsed_question(item: ManualQuestion) -> ParsedQuestion:
    return ParsedQuestion(
        number=item.number,
        stem=item.stem,
        choices=[ParsedChoice(label=label, text=text) for label, text in sorted(item.choices.items())],
        correct_label=item.correct_label,
        rationale=item.rationale,
        pi_code=normalize_pi_code(item.pi_code),
        pi_text=item.pi_text,
        lap_code=normalize_lap_code(item.lap_code) if item.lap_code else None,
        lap_title=item.lap_title,
        source_citations=item.source_citations,
    )


def build_plan() -> ExamLoadPlan:
    plan = ExamLoadPlan()
    for item in MANUAL_QUESTIONS:
        exam_id = stable_id("exam", item.exam_code)
        plan._add_question(exam_id, to_parsed_question(item))
    return plan


def emit_sql(plan: ExamLoadPlan) -> str:
    statements: list[str] = []

    ia_rows = [
        f"({sql_literal(stable_id('ia', code))}, {sql_literal(code)}, {sql_literal(name)})"
        for code, name in sorted(plan.instructional_areas.items())
    ]
    if ia_rows:
        statements.append(
            "INSERT INTO practice.instructional_areas (id, code, name)\nVALUES\n"
            + ",\n".join(ia_rows)
            + "\nON CONFLICT (code) DO NOTHING;"
        )

    pe_rows = []
    pi_rows = []
    for pi_code, row in sorted(plan.performance_indicators.items()):
        pe_id = stable_id("pe", pi_code)
        pe_rows.append(
            "("
            f"{sql_literal(pe_id)}, "
            f"(SELECT id FROM practice.instructional_areas WHERE code = {sql_literal(row['ia_code'])}), "
            f"{sql_literal(row['indicator_text'])}, "
            f"{pi_display_order(pi_code)}"
            ")"
        )
        pi_rows.append(
            "("
            f"{sql_literal(stable_id('pi', pi_code))}, "
            f"{sql_literal(pi_code)}, "
            f"{sql_literal(row['indicator_text'])}, "
            f"{sql_literal(pe_id)}, "
            f"(SELECT id FROM practice.instructional_areas WHERE code = {sql_literal(row['ia_code'])})"
            ")"
        )
    if pe_rows:
        statements.append(
            "INSERT INTO practice.performance_elements "
            "(id, instructional_area_id, element_text, display_order)\nVALUES\n"
            + ",\n".join(pe_rows)
            + "\nON CONFLICT (id) DO NOTHING;"
        )
    if pi_rows:
        statements.append(
            "INSERT INTO practice.performance_indicators "
            "(id, pi_code, indicator_text, performance_element_id, instructional_area_id)\nVALUES\n"
            + ",\n".join(pi_rows)
            + "\nON CONFLICT (pi_code) DO NOTHING;"
        )

    lap_rows = [
        f"({sql_literal(stable_id('lap', lap_code))}, {sql_literal(lap_code)}, {sql_literal(title)})"
        for lap_code, title in sorted(plan.lap_modules.items())
    ]
    if lap_rows:
        statements.append(
            "INSERT INTO testbank.lap_modules (id, lap_code, title)\nVALUES\n"
            + ",\n".join(lap_rows)
            + "\nON CONFLICT (lap_code) DO NOTHING;"
        )

    source_rows = [
        f"({sql_literal(stable_id('source', citation))}, {sql_literal(citation)}, {sql_literal(citation)})"
        for citation in sorted(plan.sources)
    ]
    if source_rows:
        statements.append(
            "INSERT INTO testbank.sources (id, citation_text, title)\nVALUES\n"
            + ",\n".join(source_rows)
            + "\nON CONFLICT (citation_text) DO NOTHING;"
        )

    question_rows = []
    for question in plan.questions.values():
        lap_sql = "NULL"
        if question["lap_code"]:
            lap_sql = (
                f"(SELECT id FROM testbank.lap_modules WHERE lap_code = {sql_literal(question['lap_code'])})"
            )
        source_sql = "NULL"
        if question["source_id"]:
            source_sql = f"{sql_literal(question['source_id'])}::uuid"
        question_rows.append(
            "("
            f"{sql_literal(question['id'])}::uuid, "
            f"{sql_literal(question['question_text'])}, "
            f"(SELECT id FROM practice.performance_indicators WHERE pi_code = {sql_literal(question['pi_code'])}), "
            f"(SELECT id FROM practice.instructional_areas WHERE code = {sql_literal(question['ia_code'])}), "
            f"'multiple_choice', "
            f"{lap_sql}, "
            f"{source_sql}, "
            f"{sql_literal(question['rationale'])}"
            ")"
        )
    statements.append(
        "INSERT INTO testbank.questions "
        "(id, question_text, pi_id, instructional_area_id, question_type, lap_module_id, source_id, rationale)\nVALUES\n"
        + ",\n".join(question_rows)
        + "\nON CONFLICT (id) DO NOTHING;"
    )

    choice_rows = [
        "("
        f"{sql_literal(choice['id'])}::uuid, "
        f"{sql_literal(choice['question_id'])}::uuid, "
        f"{sql_literal(choice['choice_label'])}, "
        f"{sql_literal(choice['choice_text'])}, "
        f"{'TRUE' if choice['is_correct'] else 'FALSE'}, "
        f"{choice['display_order']}"
        ")"
        for choice in plan.question_choices
    ]
    statements.append(
        "INSERT INTO testbank.question_choices "
        "(id, question_id, choice_label, choice_text, is_correct, display_order)\nVALUES\n"
        + ",\n".join(choice_rows)
        + "\nON CONFLICT (question_id, choice_label) DO NOTHING;"
    )

    exam_question_rows = [
        "("
        f"{sql_literal(row['exam_id'])}::uuid, "
        f"{sql_literal(row['question_id'])}::uuid, "
        f"{row['display_order']}"
        ")"
        for row in plan.exam_questions
    ]
    statements.append(
        "INSERT INTO testbank.exam_questions (exam_id, question_id, display_order)\nVALUES\n"
        + ",\n".join(exam_question_rows)
        + "\nON CONFLICT (exam_id, display_order) DO NOTHING;"
    )

    return "\n\n".join(statements) + "\n"


def main() -> None:
    plan = build_plan()
    sql = emit_sql(plan)
    OUT_SQL.write_text(sql)
    print(json.dumps({"questions": len(MANUAL_QUESTIONS), "sql_file": str(OUT_SQL)}, indent=2))


if __name__ == "__main__":
    main()
