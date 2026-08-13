"""Parse DECA roleplay / team decision making event PDFs."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path

import pdfplumber

LEVEL_NAMES = {
    "little_no_value": "Little/No Value",
    "below_expectations": "Below Expectations",
    "meets_expectations": "Meets Expectations",
    "exceeds_expectations": "Exceeds Expectations",
}

CRITERION_GROUPS = {
    "PERFORMANCE INDICATORS": "performance_indicator",
    "21st CENTURY SKILLS": "twenty_first_century_skills",
}

OVERALL_MARKERS = (
    "overall impression",
    "overall impression and responses",
)


@dataclass
class RubricLevel:
    level_name: str
    min_points: int
    max_points: int
    level_order: int


@dataclass
class RubricCriterion:
    criterion_group: str
    criterion_text: str
    display_order: int
    max_points: int
    levels: list[RubricLevel] = field(default_factory=list)
    performance_indicator_text: str | None = None


@dataclass
class ParsedRoleplay:
    event_code: str
    year: int
    level: str
    scenario_number: int
    cluster_name: str | None
    pathway_name: str | None
    instructional_area_name: str | None
    event_title: str | None
    performance_indicators: list[str]
    situation_description: str | None
    judge_characterization: str | None
    solution_text: str | None
    judge_questions: list[str]
    rubric_criteria: list[RubricCriterion]
    presentation_weight: int
    max_total_points: int
    source_path: str
    virtual: bool = False

    @property
    def scenario_title(self) -> str:
        if self.situation_description:
            match = re.search(
                r"(?:at|for)\s+([A-Z][A-Z0-9 &'\-/]+?)(?:,|\.|\s+a\s)",
                self.situation_description,
            )
            if match:
                return match.group(1).strip()
        return f"District Event {self.scenario_number}"


def _normalize(text: str) -> str:
    text = text.replace("\u2019", "'").replace("\u2018", "'")
    text = text.replace("\u2013", "-").replace("\u2014", "-")
    text = text.replace("\uf0a7", "").replace("\uf0b7", "")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n{3,}", "\n\n", text)
    return text.strip()


def _clean_line(line: str) -> str:
    return _normalize(line).strip("•§- ")


def _parse_instructional_area_name(text: str) -> str | None:
    match = re.search(
        r"INSTRUCTIONAL AREA\s*\n(.+?)(?=\n[A-Z][A-Za-z0-9 &'/()\-]+(?:SERIES|DECISION MAKING) EVENT)",
        text,
        re.DOTALL | re.IGNORECASE,
    )
    if not match:
        match = re.search(r"INSTRUCTIONAL AREA\s*\n([^\n]+)", text, re.IGNORECASE)
        if not match:
            return None
        return _clean_line(match.group(1))

    lines = [_clean_line(line) for line in match.group(1).splitlines() if line.strip()]
    if not lines:
        return None
    if len(lines) == 1:
        return lines[0]
    if lines[0].lower().endswith(" and"):
        return lines[1]
    return lines[0]


def parse_path_metadata(pdf_path: Path, event_code: str | None = None) -> dict:
    parts = pdf_path.parts
    code = event_code or pdf_path.parent.parent.name
    if code == "roleplays (event sorted)":
        code = pdf_path.parent.name
    year = int(pdf_path.parent.name) if pdf_path.parent.name.isdigit() else None

    stem = pdf_path.stem.lower()
    virtual = "virtual" in stem
    level = "district"
    for candidate in ("district", "state", "icdc"):
        if candidate in stem:
            level = candidate
            break

    scenario_number = 1
    match = re.search(r"event-(\d+)", stem)
    if match:
        scenario_number = int(match.group(1))

    return {
        "event_code": code.upper(),
        "year": year,
        "level": level,
        "scenario_number": scenario_number,
        "virtual": virtual,
    }


def parse_event_header(text: str) -> dict:
    info: dict[str, str | int | None] = {}
    code_match = re.search(r"\b([A-Z]{2,5})-(\d{2})\b", text)
    if code_match:
        info["event_code"] = code_match.group(1)
        info["year"] = 2000 + int(code_match.group(2))

    for label, key in (
        (r"CAREER CLUSTER\s*\n(.+?)(?:\nCAREER PATHWAY|\nINSTRUCTIONAL AREA|\n[A-Z ]+EVENT)",
         "cluster_name"),
        (r"CAREER PATHWAY\s*\n(.+?)(?:\nINSTRUCTIONAL AREA|\n[A-Z ]+EVENT)", "pathway_name"),
    ):
        match = re.search(label, text, re.DOTALL | re.IGNORECASE)
        if match:
            info[key] = _clean_line(match.group(1))

    ia_name = _parse_instructional_area_name(text)
    if ia_name:
        info["instructional_area_name"] = ia_name

    title_match = re.search(
        r"(?:^|\n)([A-Z][A-Z &'/()\-]+(?:SERIES|DECISION MAKING) EVENT)",
        text,
        re.MULTILINE,
    )
    if title_match:
        info["event_title"] = _clean_line(title_match.group(1))

    return info


def _strip_page_noise(text: str) -> str:
    text = re.sub(
        r"Published \d{4} by DECA Inc\..*?United States of America\.",
        "",
        text,
        flags=re.DOTALL,
    )
    text = re.sub(
        r"^[A-Z]{2,5}-\d{2}\s*\n(?:District Event[^\n]*\n)+",
        "",
        text,
        flags=re.MULTILINE | re.IGNORECASE,
    )
    return text


def extract_section(text: str, start_pattern: str, end_patterns: list[str]) -> str | None:
    start = re.search(start_pattern, text, re.IGNORECASE | re.MULTILINE | re.DOTALL)
    if not start:
        return None
    body_start = start.end()
    end_pos = len(text)
    for end_pattern in end_patterns:
        end = re.search(end_pattern, text[body_start:], re.IGNORECASE | re.MULTILINE | re.DOTALL)
        if end:
            end_pos = min(end_pos, body_start + end.start())
    section = _normalize(text[body_start:end_pos])
    return section or None


def extract_named_section(text: str, section_name: str, end_markers: list[str]) -> str | None:
    return extract_section(
        text,
        rf"(?:^|\n){re.escape(section_name)}\s*\n",
        end_markers,
    )


def parse_performance_indicators(cover_text: str) -> list[str]:
    match = re.search(
        r"PERFORMANCE INDICATORS\s*\n(.*?)(?:\nPublished \d{4} by DECA|\Z)",
        cover_text,
        re.DOTALL | re.IGNORECASE,
    )
    if not match:
        return []

    block = match.group(1)
    indicators: list[str] = []
    for raw_line in block.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        line = re.sub(r"^\d+\.\s*", "", line)
        line = line.lstrip("•§- \uf0a7\uf0b7▪").strip()
        if not line:
            continue
        if line.lower().startswith("performance indicators"):
            continue
        indicators.append(_normalize(line.rstrip(".")) + ".")

    return indicators


def parse_judge_questions(text: str) -> list[str]:
    block = extract_section(
        text,
        r"During the course of the role-play, you are to ask the following questions.*?:\s*",
        [
            r"Once the ",
            r"You are not to make any comments",
            r"EVALUATION INSTRUCTIONS",
            r"SOLUTION",
        ],
    )
    if not block:
        return []

    questions: list[str] = []
    for match in re.finditer(r"(?:^|\n)\s*\d+\.\s*(.+?)(?=\n\s*\d+\.\s|\Z)", block, re.DOTALL):
        question = _normalize(match.group(1))
        if question:
            questions.append(question)
    return questions


def _parse_point_range(cell: str | None) -> tuple[int, int] | None:
    if not cell:
        return None
    nums = [int(n) for n in re.findall(r"\d+", cell)]
    if not nums:
        return None
    return min(nums), max(nums)


def parse_rubric_from_tables(pages: list) -> tuple[list[RubricCriterion], int]:
    criteria: list[RubricCriterion] = []
    display_order = 0
    current_group = "performance_indicator"

    for page in reversed(pages):
        tables = page.extract_tables() or []
        for table in tables:
            if not table or len(table[0]) < 5:
                continue
            header = " ".join(str(c or "") for c in table[0])
            if "Exceeds" not in header and "Expectations" not in header:
                continue

            for row in table[1:]:
                if not row or len(row) < 5:
                    continue
                label = _normalize(str(row[0] or ""))
                text_cell = _normalize(str(row[1] or "").replace("\n", " "))
                if not text_cell and not label:
                    continue

                upper_label = label.upper()
                if upper_label.startswith("PERFORMANCE INDICATORS"):
                    current_group = "performance_indicator"
                    continue
                if upper_label.startswith("21ST CENTURY SKILLS"):
                    current_group = "twenty_first_century_skills"
                    continue
                if upper_label.startswith("TOTAL SCORE"):
                    break

                if not text_cell:
                    continue

                lowered = text_cell.lower()
                if any(marker in lowered for marker in OVERALL_MARKERS):
                    group = "overall_impression"
                else:
                    group = current_group

                ranges = [_parse_point_range(row[i]) for i in range(2, 6)]
                ranges = [r for r in ranges if r]
                if not ranges:
                    continue

                max_points = max(high for _, high in ranges)
                levels: list[RubricLevel] = []
                for order, (level_key, point_range) in enumerate(
                    zip(LEVEL_NAMES, ranges[:4]), start=1
                ):
                    low, high = point_range
                    levels.append(
                        RubricLevel(
                            level_name=level_key,
                            min_points=low,
                            max_points=high,
                            level_order=order,
                        )
                    )

                display_order += 1
                criterion_text = text_cell.rstrip("?").strip() + "?"
                criteria.append(
                    RubricCriterion(
                        criterion_group=group,
                        criterion_text=criterion_text,
                        display_order=display_order,
                        max_points=max_points,
                        levels=levels,
                        performance_indicator_text=(
                            criterion_text if group == "performance_indicator" else None
                        ),
                    )
                )

            if criteria:
                return criteria, sum(c.max_points for c in criteria)

    return criteria, sum(c.max_points for c in criteria)


def parse_presentation_weight(text: str) -> int:
    match = re.search(
        r"presentation will be weighted\s+(\w+)\s*\((\d+)\s*times?\)",
        text,
        re.IGNORECASE,
    )
    if match:
        return int(match.group(2))
    if re.search(r"weighted twice", text, re.IGNORECASE):
        return 2
    return 2


def extract_pdf_text(pdf_path: Path) -> tuple[str, list]:
    pages: list = []
    chunks: list[str] = []
    with pdfplumber.open(pdf_path) as pdf:
        for page in pdf.pages:
            pages.append(page)
            chunks.append(page.extract_text() or "")
    return _normalize("\n\n".join(chunks)), pages


def parse_roleplay_pdf(pdf_path: Path, *, event_code: str | None = None) -> ParsedRoleplay:
    path_meta = parse_path_metadata(pdf_path, event_code=event_code)
    full_text, pages = extract_pdf_text(pdf_path)
    cover_text = pages[0].extract_text() or ""
    clean_text = _strip_page_noise(full_text)
    header_info = parse_event_header(cover_text)

    event_code = str(header_info.get("event_code") or path_meta["event_code"])
    year = int(header_info.get("year") or path_meta["year"] or 0)
    if not year:
        raise ValueError(f"Could not determine year for {pdf_path}")

    situation = extract_named_section(
        clean_text,
        "EVENT SITUATION",
        [r"\nJUDGE INSTRUCTIONS", r"Published \d{4}"],
    ) or extract_named_section(
        clean_text,
        "CASE STUDY SITUATION",
        [r"\nJUDGE INSTRUCTIONS", r"Published \d{4}"],
    )
    judge_char = extract_section(
        clean_text,
        r"(?:^|\n)(?:JUDGE ROLE-PLAY CHARACTERIZATION|JUDGE CHARACTERIZATION)\s*\n",
        [
            r"\nDuring the course of the role-play",
            r"\nSOLUTION\s*\n",
            r"\nEVALUATION INSTRUCTIONS",
            r"\nYou are not to make any comments",
            r"Published \d{4}",
        ],
    )
    solution = extract_named_section(
        clean_text,
        "SOLUTION",
        [r"\nEVALUATION INSTRUCTIONS", r"Published \d{4}"],
    )

    performance_indicators = parse_performance_indicators(cover_text)
    judge_questions = parse_judge_questions(clean_text)
    rubric_criteria, max_total_points = parse_rubric_from_tables(pages)
    presentation_weight = parse_presentation_weight(full_text)

    if not performance_indicators and rubric_criteria:
        performance_indicators = [
            c.criterion_text.rstrip("?").strip() + "."
            for c in rubric_criteria
            if c.criterion_group == "performance_indicator"
        ]

    return ParsedRoleplay(
        event_code=event_code,
        year=year,
        level=path_meta["level"],
        scenario_number=path_meta["scenario_number"],
        cluster_name=header_info.get("cluster_name"),  # type: ignore[arg-type]
        pathway_name=header_info.get("pathway_name"),  # type: ignore[arg-type]
        instructional_area_name=header_info.get("instructional_area_name"),  # type: ignore[arg-type]
        event_title=header_info.get("event_title"),  # type: ignore[arg-type]
        performance_indicators=performance_indicators,
        situation_description=situation,
        judge_characterization=judge_char,
        solution_text=solution,
        judge_questions=judge_questions,
        rubric_criteria=rubric_criteria,
        presentation_weight=presentation_weight,
        max_total_points=max_total_points,
        source_path=str(pdf_path.resolve()),
        virtual=bool(path_meta["virtual"]),
    )
