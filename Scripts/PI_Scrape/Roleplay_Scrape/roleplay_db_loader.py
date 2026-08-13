"""Generate SQL to load parsed roleplay PDFs into Supabase."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from difflib import SequenceMatcher
from textwrap import dedent

from roleplay_parser import ParsedRoleplay, RubricCriterion

DEFAULT_SOURCE_URL = (
    "https://drive.google.com/drive/folders/123r1tpE1kTdrBTG_JOFLnHvJeFqMDNhL?usp=sharing"
)

# PDFs use standard DECA names; DB seed has OCR-corrupted variants for some rows.
IA_CANONICAL_TO_DB = {
    "Communication Skills": "Communica(on Skills",
    "Customer Relations": "Customer Rela(ons",
    "Information Management": "Informa(on Management",
    "Marketing": "Marke(ng",
    "Operations": "Opera(ons",
    # Older PFL roleplay PDFs use legacy topic labels on the cover page.
    "Credit and Debt": "Managing Credit",
    "Employment and Income": "Earning Income",
    "Spending and Saving": "Spending",
    "Risk Management and Insurance": "Managing Risk",
    "Information Management and": "Marketing-Information Management",
}


def normalize_ia_key(name: str) -> str:
    return (
        name.lower()
        .replace("(", "")
        .replace(")", "")
        .replace("-", " ")
        .strip()
    )


def build_ia_lookup(rows: list[tuple[str, str]]) -> dict[str, str]:
    lookup: dict[str, str] = {}
    for _code, name in rows:
        lookup[normalize_ia_key(name)] = name
    for canonical, db_name in IA_CANONICAL_TO_DB.items():
        lookup[normalize_ia_key(canonical)] = db_name
    return lookup


def resolve_instructional_area(name: str | None, ia_lookup: dict[str, str]) -> str | None:
    if not name:
        return None
    first_line = name.split("\n", 1)[0].strip()
    return ia_lookup.get(normalize_ia_key(first_line), first_line)


@dataclass
class PiLookup:
    pi_code: str
    indicator_text: str
    normalized: str


@dataclass
class LoadStats:
    scenarios: int = 0
    judge_questions: int = 0
    event_pis: int = 0
    rubric_templates: int = 0
    rubric_criteria: int = 0
    rubric_levels: int = 0
    unmatched_pis: list[str] = field(default_factory=list)
    sql_batches: int = 0


def sql_literal(value: str | int | None) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, int):
        return str(value)
    text = (
        str(value)
        .replace("\u2019", "'")
        .replace("\u2018", "'")
        .replace("'", "''")
    )
    return f"'{text}'"


def normalize_pi_text(text: str) -> str:
    text = text.lower().strip().rstrip(".?")
    text = re.sub(r"\s+", " ", text)
    return text


def build_pi_lookup(rows: list[tuple[str, str]]) -> list[PiLookup]:
    return [
        PiLookup(pi_code=code, indicator_text=text, normalized=normalize_pi_text(text))
        for code, text in rows
    ]


def match_pi(text: str, lookup: list[PiLookup], *, min_ratio: float = 0.82) -> str | None:
    needle = normalize_pi_text(text)
    if not needle:
        return None

    exact = [row for row in lookup if row.normalized == needle]
    if exact:
        return exact[0].pi_code

    prefix = [row for row in lookup if row.normalized.startswith(needle) or needle.startswith(row.normalized)]
    if len(prefix) == 1:
        return prefix[0].pi_code

    contains = [row for row in lookup if needle in row.normalized or row.normalized in needle]
    if len(contains) == 1:
        return contains[0].pi_code

    scored = sorted(
        (
            (SequenceMatcher(None, needle, row.normalized).ratio(), row.pi_code)
            for row in lookup
        ),
        reverse=True,
    )
    if scored and scored[0][0] >= min_ratio:
        return scored[0][1]
    return None


def scenario_key(parsed: ParsedRoleplay) -> tuple[str, int, str, int]:
    return (parsed.event_code, parsed.year, parsed.level, parsed.scenario_number)


def generate_load_sql(
    parsed: ParsedRoleplay,
    *,
    pi_lookup: list[PiLookup],
    ia_lookup: dict[str, str],
    source_url: str | None = DEFAULT_SOURCE_URL,
) -> tuple[list[str], LoadStats]:
    stats = LoadStats()
    batches: list[str] = []

    ia_name = resolve_instructional_area(parsed.instructional_area_name, ia_lookup)
    scenario_title = parsed.scenario_title

    if not parsed.situation_description:
        raise ValueError(f"Missing event situation in {parsed.source_path}")
    if not ia_name:
        raise ValueError(f"Missing instructional area in {parsed.source_path}")

    batches.append(
        dedent(
            f"""
            INSERT INTO events.scenarios (
              event_id, year, level, scenario_number,
              instructional_area_id, scenario_title,
              situation_description, judge_characterization,
              solution_text, source_url
            )
            SELECT
              e.id,
              {parsed.year},
              {sql_literal(parsed.level)},
              {parsed.scenario_number},
              ia.id,
              {sql_literal(scenario_title)},
              {sql_literal(parsed.situation_description)},
              {sql_literal(parsed.judge_characterization)},
              {sql_literal(parsed.solution_text)},
              {sql_literal(source_url or DEFAULT_SOURCE_URL)}
            FROM events.events e
            JOIN practice.instructional_areas ia
              ON ia.name = {sql_literal(ia_name)}
            WHERE e.event_code = {sql_literal(parsed.event_code)}
            ON CONFLICT (event_id, year, level, scenario_number) DO UPDATE SET
              instructional_area_id = COALESCE(EXCLUDED.instructional_area_id, events.scenarios.instructional_area_id),
              scenario_title = COALESCE(EXCLUDED.scenario_title, events.scenarios.scenario_title),
              situation_description = COALESCE(EXCLUDED.situation_description, events.scenarios.situation_description),
              judge_characterization = COALESCE(EXCLUDED.judge_characterization, events.scenarios.judge_characterization),
              solution_text = COALESCE(EXCLUDED.solution_text, events.scenarios.solution_text),
              source_url = EXCLUDED.source_url;
            """
        ).strip()
    )
    stats.scenarios = 1

    if parsed.judge_questions:
        question_rows = []
        for order, question in enumerate(parsed.judge_questions, start=1):
            question_rows.append(f"({order}, {sql_literal(question)})")
            stats.judge_questions += 1
        batches.append(
            dedent(
                f"""
                DELETE FROM events.scenario_judge_questions q
                USING events.events e, events.scenarios s
                WHERE q.scenario_id = s.id
                  AND s.event_id = e.id
                  AND e.event_code = {sql_literal(parsed.event_code)}
                  AND s.year = {parsed.year}
                  AND s.level = {sql_literal(parsed.level)}
                  AND s.scenario_number = {parsed.scenario_number};

                INSERT INTO events.scenario_judge_questions (
                  scenario_id, question_text, display_order
                )
                SELECT s.id, v.question_text, v.display_order
                FROM (VALUES {", ".join(question_rows)}) AS v(display_order, question_text)
                JOIN events.events e ON e.event_code = {sql_literal(parsed.event_code)}
                JOIN events.scenarios s
                  ON s.event_id = e.id
                 AND s.year = {parsed.year}
                 AND s.level = {sql_literal(parsed.level)}
                 AND s.scenario_number = {parsed.scenario_number};
                """
            ).strip()
        )

    event_pi_rows: list[str] = []
    seen_event_pis: set[str] = set()
    for order, pi_text in enumerate(parsed.performance_indicators, start=1):
        pi_code = match_pi(pi_text, pi_lookup)
        if not pi_code:
            stats.unmatched_pis.append(pi_text)
            continue
        if pi_code in seen_event_pis:
            continue
        seen_event_pis.add(pi_code)
        event_pi_rows.append(f"({sql_literal(pi_code)}, {order})")
        stats.event_pis += 1

    if event_pi_rows:
        batches.append(
            dedent(
                f"""
                INSERT INTO events.event_performance_indicators (
                  event_id, pi_id, display_order
                )
                SELECT e.id, pi.id, v.display_order
                FROM (VALUES {", ".join(event_pi_rows)}) AS v(pi_code, display_order)
                JOIN events.events e ON e.event_code = {sql_literal(parsed.event_code)}
                JOIN practice.performance_indicators pi ON pi.pi_code = v.pi_code
                ON CONFLICT (event_id, pi_id) DO UPDATE SET
                  display_order = EXCLUDED.display_order;
                """
            ).strip()
        )

    rubric_title = parsed.event_title or f"{parsed.event_code} {parsed.year} Judge Evaluation"
    if parsed.scenario_number == 1:
        batches.append(
            dedent(
                f"""
                INSERT INTO rubric.rubric_templates (
                  event_id, year, title, max_total_points, presentation_weight
                )
                SELECT
                  e.id,
                  {parsed.year},
                  {sql_literal(rubric_title)},
                  {parsed.max_total_points},
                  {parsed.presentation_weight}
                FROM events.events e
                WHERE e.event_code = {sql_literal(parsed.event_code)}
                ON CONFLICT (event_id, year) DO UPDATE SET
                  title = EXCLUDED.title,
                  max_total_points = EXCLUDED.max_total_points,
                  presentation_weight = EXCLUDED.presentation_weight;
                """
            ).strip()
        )
        stats.rubric_templates = 1

    criterion_rows: list[str] = []
    level_rows: list[str] = []
    for criterion in parsed.rubric_criteria:
        pi_code = "NULL"
        if criterion.criterion_group == "performance_indicator":
            source_text = criterion.performance_indicator_text or criterion.criterion_text
            matched = match_pi(source_text, pi_lookup)
            if matched:
                pi_code = sql_literal(matched)
            elif source_text:
                stats.unmatched_pis.append(source_text)

        criterion_rows.append(
            "("
            f"{criterion.display_order}, "
            f"{sql_literal(criterion.criterion_group)}, "
            f"{sql_literal(criterion.criterion_text)}, "
            f"{pi_code if pi_code != 'NULL' else 'NULL'}, "
            f"{criterion.max_points}"
            ")"
        )
        stats.rubric_criteria += 1

        for level in criterion.levels:
            level_rows.append(
                "("
                f"{criterion.display_order}, "
                f"{sql_literal(level.level_name)}, "
                f"{level.min_points}, "
                f"{level.max_points}, "
                f"{level.level_order}"
                ")"
            )
            stats.rubric_levels += 1

    if criterion_rows and parsed.scenario_number == 1:
        batches.append(
            dedent(
                f"""
                DELETE FROM rubric.rubric_criteria rc
                USING events.events e, rubric.rubric_templates rt
                WHERE rc.rubric_template_id = rt.id
                  AND rt.event_id = e.id
                  AND e.event_code = {sql_literal(parsed.event_code)}
                  AND rt.year = {parsed.year};

                INSERT INTO rubric.rubric_criteria (
                  rubric_template_id, display_order, criterion_group,
                  criterion_text, pi_id, max_points
                )
                SELECT
                  rt.id,
                  v.display_order,
                  v.criterion_group,
                  v.criterion_text,
                  pi.id,
                  v.max_points
                FROM (VALUES {", ".join(criterion_rows)}) AS v(
                  display_order, criterion_group, criterion_text, pi_code, max_points
                )
                JOIN events.events e ON e.event_code = {sql_literal(parsed.event_code)}
                JOIN rubric.rubric_templates rt
                  ON rt.event_id = e.id AND rt.year = {parsed.year}
                LEFT JOIN practice.performance_indicators pi
                  ON pi.pi_code = v.pi_code;
                """
            ).strip()
        )

    if level_rows and parsed.scenario_number == 1:
        batches.append(
            dedent(
                f"""
                INSERT INTO rubric.rubric_levels (
                  criterion_id, level_name, min_points, max_points, level_order
                )
                SELECT
                  rc.id,
                  v.level_name,
                  v.min_points,
                  v.max_points,
                  v.level_order
                FROM (VALUES {", ".join(level_rows)}) AS v(
                  display_order, level_name, min_points, max_points, level_order
                )
                JOIN events.events e ON e.event_code = {sql_literal(parsed.event_code)}
                JOIN rubric.rubric_templates rt
                  ON rt.event_id = e.id AND rt.year = {parsed.year}
                JOIN rubric.rubric_criteria rc
                  ON rc.rubric_template_id = rt.id
                 AND rc.display_order = v.display_order
                ON CONFLICT (criterion_id, level_name) DO UPDATE SET
                  min_points = EXCLUDED.min_points,
                  max_points = EXCLUDED.max_points,
                  level_order = EXCLUDED.level_order;
                """
            ).strip()
        )

    stats.sql_batches = len(batches)
    return batches, stats


def generate_folder_sql(
    parsed_items: list[ParsedRoleplay],
    *,
    pi_lookup: list[PiLookup],
    ia_lookup: dict[str, str],
) -> tuple[list[str], LoadStats]:
    combined = LoadStats()
    batches: list[str] = []
    for parsed in parsed_items:
        item_batches, item_stats = generate_load_sql(
            parsed, pi_lookup=pi_lookup, ia_lookup=ia_lookup
        )
        batches.extend(item_batches)
        combined.scenarios += item_stats.scenarios
        combined.judge_questions += item_stats.judge_questions
        combined.event_pis += item_stats.event_pis
        combined.rubric_templates += item_stats.rubric_templates
        combined.rubric_criteria += item_stats.rubric_criteria
        combined.rubric_levels += item_stats.rubric_levels
        combined.unmatched_pis.extend(item_stats.unmatched_pis)
    combined.sql_batches = len(batches)
    return batches, combined
