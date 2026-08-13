"""Parse Jump$tart / CEE National Standards for Personal Financial Education PDFs."""

from __future__ import annotations

import re
from pathlib import Path

import pdfplumber

from pi_parser import (
    EventPageMapping,
    ParsedBlueprint,
    ParsedIndicator,
    summarize_blueprint,
)

CLUSTER_NAME = "Personal Financial Literacy"
SOURCE_YEAR = 2021

TOPICS: dict[str, tuple[str, str]] = {
    "Earning Income": ("EI", "Earning Income"),
    "Earning": ("EI", "Earning Income"),
    "Spending": ("SPD", "Spending"),
    "Saving": ("SV", "Saving"),
    "Investing": ("INV", "Investing"),
    "Managing Credit": ("MCR", "Managing Credit"),
    "Credit": ("MCR", "Managing Credit"),
    "Managing Risk": ("MRK", "Managing Risk"),
    "Risk": ("MRK", "Managing Risk"),
}

GRADE_TIER = {"4": "G4", "8": "G8", "12": "G12"}

STANDARD_ID_RE = re.compile(r"\b((?:4|8|12)-(\d+))\b")
OUTCOME_RE = re.compile(r"\b((?:4|8|12)-(\d+)([a-z]))\s*\.\s*(.+?)(?=\s*(?:\d{1,2}-\d+[a-z]\s*\.|$))", re.DOTALL)

PFL_EVENT_CODES = ("PFL",)


def is_pfl_pdf(pdf_path: Path) -> bool:
    with pdfplumber.open(pdf_path) as pdf:
        sample = "\n".join((page.extract_text() or "") for page in pdf.pages[:3])
    return "National Standards" in sample and "Personal Financial" in sample


def _normalize_whitespace(text: str) -> str:
    return re.sub(r"\s+", " ", text.replace("\u2019", "'").replace("\u2018", "'")).strip()


def _parse_topic_and_standard(cell: str) -> tuple[str, str, str] | None:
    cleaned = cell.replace("\n", " ").strip()
    cleaned = re.sub(r"\s*\\\s*$", "", cleaned)
    match = STANDARD_ID_RE.search(cleaned)
    if not match:
        return None
    standard_id = match.group(1)
    prefix = cleaned[: match.start()].strip()
    if not prefix:
        return None
    topic_key = prefix
    for key in sorted(TOPICS, key=len, reverse=True):
        if prefix == key or prefix.startswith(key + " "):
            topic_key = key
            break
    if topic_key not in TOPICS:
        return None
    ia_code, ia_name = TOPICS[topic_key]
    return ia_code, ia_name, standard_id


def _parse_outcomes(outcomes_text: str) -> list[tuple[str, str]]:
    text = outcomes_text or ""
    results: list[tuple[str, str]] = []
    for match in OUTCOME_RE.finditer(text):
        outcome_id = match.group(1)
        outcome_text = _normalize_whitespace(match.group(4))
        if outcome_text:
            results.append((outcome_id, outcome_text))
    return results


def parse_pfl_blueprint(pdf_path: Path) -> ParsedBlueprint:
    instructional_areas: dict[str, dict[str, str]] = {}
    performance_elements: list[dict] = []
    indicators: list[ParsedIndicator] = []
    seen_elements: set[tuple[str, str]] = set()
    seen_outcomes: set[str] = set()

    element_display_order = 0
    blueprint_display_order = 0

    with pdfplumber.open(pdf_path) as pdf:
        total_pages = len(pdf.pages)
        content_pages: set[int] = set()

        for page_index, page in enumerate(pdf.pages):
            pdf_page = page_index + 1
            tables = page.extract_tables() or []
            for table in tables:
                if not table or len(table[0]) < 3:
                    continue
                table_text = " ".join(
                    str(cell or "")
                    for row in table[:2]
                    for cell in row
                )
                if "Learning Outcomes" not in table_text:
                    continue

                for row in table[1:]:
                    if not row or len(row) < 3:
                        continue
                    topic_cell = str(row[0] or "").strip()
                    standard_text = _normalize_whitespace(str(row[1] or ""))
                    outcomes_text = str(row[2] or "")
                    if not topic_cell or not standard_text:
                        continue
                    if "Students will know" in topic_cell:
                        continue

                    parsed_row = _parse_topic_and_standard(topic_cell)
                    if not parsed_row:
                        continue

                    ia_code, ia_name, standard_id = parsed_row
                    content_pages.add(pdf_page)

                    if ia_code not in instructional_areas:
                        instructional_areas[ia_code] = {
                            "code": ia_code,
                            "name": ia_name,
                            "standard_text": f"Jump$tart / CEE National Standards — {ia_name}",
                        }

                    element_key = (ia_code, standard_id)
                    if element_key not in seen_elements:
                        seen_elements.add(element_key)
                        element_display_order += 1
                        performance_elements.append(
                            {
                                "instructional_area_code": ia_code,
                                "element_text": standard_text,
                                "display_order": element_display_order,
                                "standard_id": standard_id,
                            }
                        )

                    grade = standard_id.split("-", 1)[0]
                    tier_code = GRADE_TIER.get(grade, "G4")
                    pi_prefix = f"{ia_code}:{standard_id}"

                    for outcome_id, outcome_text in _parse_outcomes(outcomes_text):
                        pi_code = f"{ia_code}:{outcome_id}"
                        if pi_code in seen_outcomes:
                            continue
                        seen_outcomes.add(pi_code)
                        blueprint_display_order += 1
                        indicators.append(
                            ParsedIndicator(
                                pi_code=pi_code,
                                indicator_text=outcome_text,
                                tier_code=tier_code,
                                instructional_area_code=ia_code,
                                instructional_area_name=ia_name,
                                standard_text=standard_text,
                                performance_element_text=standard_text,
                                element_display_order=element_display_order,
                                blueprint_display_order=blueprint_display_order,
                                pdf_page=pdf_page,
                                section_name=ia_name,
                            )
                        )

    if not indicators:
        raise ValueError(f"No learning outcomes found in {pdf_path}")

    event_page_mappings = [
        EventPageMapping(
            event_code="PFL",
            event_name="Personal Financial Literacy",
            pathway_name=None,
            page_numbers=content_pages,
        )
    ]

    return ParsedBlueprint(
        cluster_name=CLUSTER_NAME,
        exam_year_start=SOURCE_YEAR,
        exam_year_end=SOURCE_YEAR + 1,
        posted_date=f"{SOURCE_YEAR}-01-01",
        source_path=str(pdf_path.resolve()),
        total_pdf_pages=total_pages,
        event_codes_from_cover={"Personal Financial Literacy": "PFL"},
        event_page_mappings=event_page_mappings,
        instructional_areas=instructional_areas,
        performance_elements=performance_elements,
        indicators=indicators,
    )


__all__ = ["is_pfl_pdf", "parse_pfl_blueprint", "summarize_blueprint"]
