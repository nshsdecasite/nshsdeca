"""Parse DECA cluster exam PDFs into structured question/answer data."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

from pypdf import PdfReader

from pdf_ligatures import fix_pdf_ligatures

EXAM_SLUG_TITLES = {
    "bac": "Business Administration Core Exam",
    "bma": "Business Management and Administration Exam",
    "entrepreneurship": "Entrepreneurship Exam",
    "finance": "Finance Exam",
    "hospitality": "Hospitality and Tourism Exam",
    "marketing": "Marketing Exam",
    "pfl": "Personal Financial Literacy Exam",
}

SLUG_CLUSTER_SLUG = {
    "bac": "principles",
    "bma": "business-management-and-administration",
    "entrepreneurship": "entrepreneurship",
    "finance": "finance",
    "hospitality": "hospitality-and-tourism",
    "marketing": "marketing",
    "pfl": "personal-financial-literacy",
}

CLUSTER_EVENT_CODES = {
    "bac": [],
    "bma": ["PBM", "HRM", "BLTDM"],
    "entrepreneurship": ["ENT", "ETDM"],
    "finance": ["ACT", "BFS", "FCE", "FTDM"],
    "hospitality": ["HLM", "HTDM", "HTPS", "QSRM", "RFSM", "TTDM"],
    "marketing": [
        "AAM",
        "ASM",
        "BSM",
        "BTDM",
        "FMS",
        "MCS",
        "MTDM",
        "PSE",
        "RMS",
        "SEM",
        "STDM",
    ],
    "pfl": ["PFL"],
}

IA_NAMES = {
    "BL": "Business Law",
    "CM": "Channel Management",
    "CO": "Communication Skills",
    "CR": "Customer Relations",
    "EC": "Economics",
    "EI": "Earning Income",
    "EN": "Entrepreneurship",
    "FI": "Financial Analysis",
    "FM": "Financial-Information Management",
    "HR": "Human Resources Management",
    "IM": "Marketing-Information Management",
    "INV": "Investing",
    "KM": "Knowledge Management",
    "MCR": "Managing Credit",
    "MK": "Marketing",
    "NF": "Negotiating",
    "OP": "Operations",
    "PD": "Product/Service Management",
    "PM": "Pricing",
    "PR": "Promotion",
    "PS": "Problem Solving",
    "RM": "Risk Management",
    "SM": "Strategic Management",
    "SE": "Selling",
    "SU": "Supervision",
    "QC": "Quality Control",
    "DS": "Distribution",
    "FD": "Financial Decision Making",
    "MP": "Market Planning",
    "BI": "Business Information Management",
}


@dataclass
class ParsedChoice:
    label: str
    text: str


@dataclass
class ParsedQuestion:
    number: int
    stem: str
    choices: list[ParsedChoice]
    correct_label: str
    rationale: str
    pi_code: str | None
    pi_text: str | None
    lap_code: str | None
    lap_title: str | None
    source_citations: list[str] = field(default_factory=list)


@dataclass
class ParsedExam:
    slug: str
    year: int
    title: str
    cluster_slug: str
    exam_code: str
    test_number: str | None
    posted_date: str | None
    event_codes: list[str]
    questions: list[ParsedQuestion]
    source_path: str


def extract_text(path: Path) -> str:
    text = "\n".join((page.extract_text() or "") for page in PdfReader(str(path)).pages)
    return fix_pdf_ligatures(text) or ""


def normalize_pi_code(raw: str | None) -> str | None:
    if not raw:
        return None
    compact = re.sub(r"\s+", "", raw.upper())
    match = re.match(r"([A-Z]{2,4}):(\d{1,3})$", compact)
    if not match:
        return None
    return f"{match.group(1)}:{int(match.group(2)):03d}"


def normalize_lap_code(raw: str | None) -> str | None:
    if not raw:
        return None
    compact = re.sub(r"\s+", "", raw.upper())
    match = re.match(r"LAP-([A-Z]{2,4})-(\d{1,3})$", compact)
    if not match:
        return None
    return f"LAP-{match.group(1)}-{int(match.group(2)):03d}"


def ia_code_from_pi(pi_code: str | None) -> str | None:
    if not pi_code:
        return None
    return pi_code.split(":", 1)[0]


def find_key_start(text: str) -> int:
    markers: list[int] = []
    patterns = [
        r"EXAM\s*[\u2014\-]\s*KEY",
        r"LITERACY\s*[\u2014\-]\s*KEY",
        r"Test\s+Key",
        r"ANSWER\s+KEY",
        r"DESCRIPTIVE\s+TEST\s+KEY",
    ]
    threshold = len(text) * 0.15
    for pattern in patterns:
        for match in re.finditer(pattern, text, re.I):
            if match.start() > threshold:
                markers.append(match.start())
    return min(markers) if markers else -1


def extract_choices(body: str) -> dict[str, str]:
    normalized = re.sub(r"([^\n])\s+([A-D])\.\s+", r"\n\2. ", body)
    choices: dict[str, str] = {}
    for label in "ABCD":
        match = re.search(
            rf"(?:^|\n)\s*{label}\.\s+(.+?)(?=\n\s*[A-D]\.\s+|\Z)",
            normalized,
            re.S,
        )
        if match:
            choices[label] = fix_pdf_ligatures(re.sub(r"\s+", " ", match.group(1).strip())) or ""
    return choices


def parse_questions(qtext: str) -> dict[int, dict[str, object]]:
    qtext = re.sub(r"\f", "\n", qtext)
    qtext = re.sub(r"Test\s+\d+[^\n]*\n", "\n", qtext)
    qtext = re.sub(r"Copyright ©[^\n]*\n", "\n", qtext)
    questions: dict[int, dict[str, object]] = {}
    for match in re.finditer(
        r"(?:^|\n)\s*(\d{1,3})\.\s+(.+?)(?=(?:\n\s*\d{1,3}\.\s+)|\Z)",
        qtext,
        re.S,
    ):
        number = int(match.group(1))
        if number > 100:
            continue
        body = match.group(2)
        choices = extract_choices(body)
        stem_match = re.match(r"(.+?)(?=\n\s*A\.\s)", body, re.S)
        if not stem_match or len(choices) < 4:
            continue
        stem = fix_pdf_ligatures(re.sub(r"\s+", " ", stem_match.group(1).strip())) or ""
        if len(stem) < 8:
            continue
        questions[number] = {"stem": stem, "choices": choices}
    return questions


def parse_answer_block(block: str) -> dict[str, object]:
    rationale = fix_pdf_ligatures(re.sub(r"\s+", " ", block).strip()) or ""
    pi_code = None
    pi_text = None
    lap_code = None
    lap_title = None
    source_citations: list[str] = []

    for line in block.splitlines():
        stripped = line.strip()
        if not stripped.startswith("SOURCE:"):
            continue
        payload = stripped[len("SOURCE:") :].strip()
        if not payload:
            continue

        compact = re.sub(r"\s+", "", payload)
        pi_match = re.match(r"([A-Z]{2,4}):?(\d{1,3})(.*)", compact)
        if pi_match and pi_match.group(1).isalpha() and len(pi_match.group(1)) <= 4:
            pi_code = normalize_pi_code(f"{pi_match.group(1)}:{pi_match.group(2)}")
            remainder = pi_match.group(3).strip()
            if remainder:
                pi_text = fix_pdf_ligatures(remainder)
            continue

        lap_match = re.match(
            r"(LAP-[\sA-Z]{2,4}-[\s\d]{1,3})[\u2014\-](.+)",
            payload,
            re.I,
        )
        if lap_match:
            lap_code = normalize_lap_code(lap_match.group(1))
            lap_title = fix_pdf_ligatures(lap_match.group(2).strip())
            continue

        if re.search(r"\(\d{4}", payload) or "Retrieved" in payload or "http" in payload:
            source_citations.append(re.sub(r"\s+", " ", payload))
            continue

        if len(payload) <= 4 and payload.isalpha():
            continue

        source_citations.append(re.sub(r"\s+", " ", payload))

    return {
        "rationale": rationale[:4000],
        "pi_code": pi_code,
        "pi_text": pi_text,
        "lap_code": lap_code,
        "lap_title": lap_title,
        "source_citations": source_citations,
    }


def parse_key(ktext: str) -> dict[int, dict[str, object]]:
    ktext = re.sub(r"Test\s+\d+[^\n]*\n", "\n", ktext)
    ktext = re.sub(r"Copyright ©[^\n]*\n", "\n", ktext)
    answers: dict[int, dict[str, object]] = {}
    for match in re.finditer(r"(?:^|\n)\s*(\d{1,3})\.\s*([A-D])\b", ktext):
        number = int(match.group(1))
        if number > 100:
            continue
        start = match.end()
        next_match = re.search(r"(?:^|\n)\s*\d{1,3}\.\s*[A-D]\b", ktext[start:])
        end = start + next_match.start() if next_match else len(ktext)
        block = ktext[start:end]
        parsed = parse_answer_block(block)
        parsed["answer"] = match.group(2)
        answers[number] = parsed
    return answers


def parse_posted_date(text: str) -> str | None:
    match = re.search(
        r"Posted online\s+([A-Za-z]+)\s+(\d{4})\s+by\s+DECA",
        text,
        re.I,
    )
    if not match:
        return None
    month_map = {
        "january": "01",
        "february": "02",
        "march": "03",
        "april": "04",
        "may": "05",
        "june": "06",
        "july": "07",
        "august": "08",
        "september": "09",
        "october": "10",
        "november": "11",
        "december": "12",
    }
    month = month_map.get(match.group(1).lower())
    if not month:
        return None
    return f"{match.group(2)}-{month}-01"


def parse_test_number(text: str) -> str | None:
    match = re.search(r"Test\s+(\d{3,5})\b", text)
    return match.group(1) if match else None


def parse_event_codes(text: str, slug: str) -> list[str]:
    block_match = re.search(
        r"FOR THE FOLLOWING EVENTS:\s*(.+?)(?:Test\s+\d+|\n\s*1\.\s)",
        text,
        re.S | re.I,
    )
    if not block_match:
        return CLUSTER_EVENT_CODES.get(slug, [])

    codes: list[str] = []
    for line in block_match.group(1).splitlines():
        stripped = line.strip()
        if not stripped:
            continue
        code_match = re.search(r"\b([A-Z]{2,5})\s*$", stripped)
        if code_match:
            codes.append(code_match.group(1))
    return codes or CLUSTER_EVENT_CODES.get(slug, [])


def parse_exam_pdf(path: Path) -> ParsedExam:
    slug = path.parent.name
    year = int(path.stem)
    text = extract_text(path)
    key_start = find_key_start(text)
    question_text = text[:key_start] if key_start > 0 else text
    key_text = text[key_start:] if key_start > 0 else ""

    questions = parse_questions(question_text)
    answers = parse_key(key_text)

    parsed_questions: list[ParsedQuestion] = []
    for number in sorted(questions):
        if number not in answers:
            continue
        question = questions[number]
        answer = answers[number]
        parsed_questions.append(
            ParsedQuestion(
                number=number,
                stem=str(question["stem"]),
                choices=[
                    ParsedChoice(label=label, text=text)
                    for label, text in sorted(question["choices"].items())  # type: ignore[index]
                ],
                correct_label=str(answer["answer"]),
                rationale=str(answer["rationale"]),
                pi_code=answer["pi_code"],  # type: ignore[arg-type]
                pi_text=answer["pi_text"],  # type: ignore[arg-type]
                lap_code=answer["lap_code"],  # type: ignore[arg-type]
                lap_title=answer["lap_title"],  # type: ignore[arg-type]
                source_citations=list(answer["source_citations"]),  # type: ignore[arg-type]
            )
        )

    return ParsedExam(
        slug=slug,
        year=year,
        title=EXAM_SLUG_TITLES.get(slug, slug),
        cluster_slug=SLUG_CLUSTER_SLUG[slug],
        exam_code=f"{slug}-{year}",
        test_number=parse_test_number(text),
        posted_date=parse_posted_date(text),
        event_codes=parse_event_codes(text, slug),
        questions=parsed_questions,
        source_path=str(path),
    )


def iter_exam_pdfs(exam_dir: Path) -> list[Path]:
    return sorted(exam_dir.rglob("*.pdf"))
