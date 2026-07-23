#!/usr/bin/env python3
"""Parse DECA exam PDFs and load them into Supabase testbank tables."""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import uuid
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from exam_parser import (
    IA_NAMES,
    SLUG_CLUSTER_SLUG,
    ParsedExam,
    ParsedQuestion,
    ia_code_from_pi,
    iter_exam_pdfs,
    parse_exam_pdf,
)

ROOT = Path(__file__).resolve().parents[1]
EXAM_DIR = ROOT / "data" / "exams"
SQL_DIR = ROOT / "data" / "exams" / "sql_batches"
CHUNK_DIR = ROOT / "data" / "exams" / "sql_chunks"
MAX_CHUNK_BYTES = 80_000
NAMESPACE = uuid.UUID("f47ac10b-58cc-4372-a567-0e02b2c3d479")
FALLBACK_PI_CODE = "UN:000"
FALLBACK_IA_CODE = "UN"


def stable_id(kind: str, key: str) -> str:
    return str(uuid.uuid5(NAMESPACE, f"nshs-deca:{kind}:{key}"))


def sql_literal(value: str | None) -> str:
    if value is None:
        return "NULL"
    return "'" + value.replace("'", "''") + "'"


def pi_display_order(pi_code: str) -> int:
    try:
        return int(pi_code.split(":", 1)[1])
    except (IndexError, ValueError):
        return 0


def question_fingerprint(question: ParsedQuestion) -> str:
    parts = [
        question.stem.strip().lower(),
        question.pi_code or FALLBACK_PI_CODE,
    ]
    for choice in sorted(question.choices, key=lambda item: item.label):
        parts.append(f"{choice.label}:{choice.text.strip().lower()}")
    return hashlib.sha256("|".join(parts).encode()).hexdigest()


class ExamLoadPlan:
    def __init__(self) -> None:
        self.instructional_areas: dict[str, str] = {}
        self.performance_indicators: dict[str, dict[str, str]] = {}
        self.lap_modules: dict[str, str] = {}
        self.sources: dict[str, None] = {}
        self.questions: dict[str, dict] = {}
        self.question_choices: list[dict] = []
        self.exams: list[dict] = []
        self.exam_events: list[dict] = []
        self.exam_questions: list[dict] = []

    def add_exam(self, exam: ParsedExam) -> None:
        exam_id = stable_id("exam", exam.exam_code)
        slug = exam.exam_code.rsplit("-", 1)[0]
        cluster_slug = SLUG_CLUSTER_SLUG.get(slug)
        if not cluster_slug:
            raise ValueError(f"No cluster mapping for exam slug {slug!r}")
        self.exams.append(
            {
                "id": exam_id,
                "exam_code": exam.exam_code,
                "title": exam.title,
                "year": exam.year,
                "cluster_slug": cluster_slug,
                "posted_date": exam.posted_date,
                "source_org": "MBA Research Center",
            }
        )

        for event_code in exam.event_codes:
            self.exam_events.append(
                {
                    "exam_id": exam_id,
                    "event_code": event_code,
                }
            )

        for question in exam.questions:
            self._add_question(exam_id, question)

    def _ensure_ia(self, code: str, name: str | None = None) -> None:
        if code not in self.instructional_areas:
            self.instructional_areas[code] = name or IA_NAMES.get(code, code)

    def _ensure_pi(self, pi_code: str, pi_text: str | None, ia_code: str) -> None:
        self._ensure_ia(ia_code)
        if pi_code not in self.performance_indicators:
            self.performance_indicators[pi_code] = {
                "pi_code": pi_code,
                "indicator_text": pi_text or pi_code,
                "ia_code": ia_code,
            }
        elif pi_text and self.performance_indicators[pi_code]["indicator_text"] == pi_code:
            self.performance_indicators[pi_code]["indicator_text"] = pi_text

    def _add_question(self, exam_id: str, question: ParsedQuestion) -> None:
        pi_code = question.pi_code or FALLBACK_PI_CODE
        ia_code = ia_code_from_pi(pi_code) or FALLBACK_IA_CODE
        if pi_code == FALLBACK_PI_CODE:
            self._ensure_ia(FALLBACK_IA_CODE, "Unclassified")
            self._ensure_pi(
                FALLBACK_PI_CODE,
                "Unspecified performance indicator",
                FALLBACK_IA_CODE,
            )
        else:
            self._ensure_pi(pi_code, question.pi_text, ia_code)

        lap_id = None
        if question.lap_code:
            lap_id = stable_id("lap", question.lap_code)
            self.lap_modules[question.lap_code] = question.lap_title or question.lap_code

        source_id = None
        if question.source_citations:
            citation = question.source_citations[0]
            source_id = stable_id("source", citation)
            self.sources[citation] = None

        fingerprint = question_fingerprint(question)
        question_id = stable_id("question", fingerprint)
        if fingerprint not in self.questions:
            self.questions[fingerprint] = {
                "id": question_id,
                "question_text": question.stem,
                "pi_code": pi_code,
                "ia_code": ia_code,
                "lap_code": question.lap_code,
                "source_id": source_id,
                "rationale": question.rationale,
                "choices": question.choices,
            }

        for order, choice in enumerate(sorted(question.choices, key=lambda item: item.label), start=1):
            self.question_choices.append(
                {
                    "id": stable_id("choice", f"{question_id}:{choice.label}"),
                    "question_id": question_id,
                    "choice_label": choice.label,
                    "choice_text": choice.text,
                    "is_correct": choice.label == question.correct_label,
                    "display_order": order,
                }
            )

        self.exam_questions.append(
            {
                "exam_id": exam_id,
                "question_id": question_id,
                "display_order": question.number,
            }
        )


def build_plan(exam_dir: Path) -> ExamLoadPlan:
    plan = ExamLoadPlan()
    for pdf in iter_exam_pdfs(exam_dir):
        plan.add_exam(parse_exam_pdf(pdf))
    return plan


def chunked(items: list, size: int) -> list[list]:
    return [items[index : index + size] for index in range(0, len(items), size)]


def write_sql_batches(plan: ExamLoadPlan, out_dir: Path) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    for existing in out_dir.glob("*.sql"):
        existing.unlink()

    files: list[Path] = []
    batch_index = 0

    def emit(sql: str) -> None:
        nonlocal batch_index
        batch_index += 1
        path = out_dir / f"{batch_index:03d}.sql"
        path.write_text(sql)
        files.append(path)

    ia_rows = [
        f"({sql_literal(stable_id('ia', code))}, {sql_literal(code)}, {sql_literal(name)})"
        for code, name in sorted(plan.instructional_areas.items())
    ]
    for group in chunked(ia_rows, 100):
        emit(
            "INSERT INTO practice.instructional_areas (id, code, name)\nVALUES\n"
            + ",\n".join(group)
            + "\nON CONFLICT (code) DO NOTHING;\n"
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
    for group in chunked(pe_rows, 100):
        emit(
            "INSERT INTO practice.performance_elements "
            "(id, instructional_area_id, element_text, display_order)\nVALUES\n"
            + ",\n".join(group)
            + "\nON CONFLICT (id) DO NOTHING;\n"
        )
    for group in chunked(pi_rows, 100):
        emit(
            "INSERT INTO practice.performance_indicators "
            "(id, pi_code, indicator_text, performance_element_id, instructional_area_id)\nVALUES\n"
            + ",\n".join(group)
            + "\nON CONFLICT (pi_code) DO NOTHING;\n"
        )

    lap_rows = [
        f"({sql_literal(stable_id('lap', lap_code))}, {sql_literal(lap_code)}, {sql_literal(title)})"
        for lap_code, title in sorted(plan.lap_modules.items())
    ]
    for group in chunked(lap_rows, 100):
        emit(
            "INSERT INTO testbank.lap_modules (id, lap_code, title)\nVALUES\n"
            + ",\n".join(group)
            + "\nON CONFLICT (lap_code) DO NOTHING;\n"
        )

    source_rows = [
        f"({sql_literal(stable_id('source', citation))}, {sql_literal(citation)}, {sql_literal(citation)})"
        for citation in sorted(plan.sources)
    ]
    for group in chunked(source_rows, 50):
        emit(
            "INSERT INTO testbank.sources (id, citation_text, title)\nVALUES\n"
            + ",\n".join(group)
            + "\nON CONFLICT (citation_text) DO NOTHING;\n"
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
    for group in chunked(question_rows, 40):
        emit(
            "INSERT INTO testbank.questions "
            "(id, question_text, pi_id, instructional_area_id, question_type, lap_module_id, source_id, rationale)\nVALUES\n"
            + ",\n".join(group)
            + "\nON CONFLICT (id) DO NOTHING;\n"
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
    for group in chunked(choice_rows, 80):
        emit(
            "INSERT INTO testbank.question_choices "
            "(id, question_id, choice_label, choice_text, is_correct, display_order)\nVALUES\n"
            + ",\n".join(group)
            + "\nON CONFLICT (question_id, choice_label) DO NOTHING;\n"
        )

    exam_rows = [
        "("
        f"{sql_literal(exam['id'])}::uuid, "
        f"{sql_literal(exam['exam_code'])}, "
        f"{sql_literal(exam['title'])}, "
        f"{exam['year']}, "
        f"(SELECT id FROM practice.clusters WHERE slug = {sql_literal(exam['cluster_slug'])}), "
        f"{sql_literal(exam['posted_date'])}, "
        f"{sql_literal(exam['source_org'])}"
        ")"
        for exam in plan.exams
    ]
    for group in chunked(exam_rows, 50):
        emit(
            "INSERT INTO testbank.exams (id, exam_code, title, year, cluster_id, posted_date, source_org)\nVALUES\n"
            + ",\n".join(group)
            + "\nON CONFLICT (exam_code) DO NOTHING;\n"
        )

    event_rows = [
        "("
        f"{sql_literal(row['exam_id'])}::uuid, "
        f"(SELECT id FROM events.events WHERE event_code = {sql_literal(row['event_code'])})"
        ")"
        for row in plan.exam_events
    ]
    for group in chunked(event_rows, 80):
        emit(
            "INSERT INTO testbank.exam_events (exam_id, event_id)\nVALUES\n"
            + ",\n".join(group)
            + "\nON CONFLICT (exam_id, event_id) DO NOTHING;\n"
        )

    exam_question_rows = [
        "("
        f"{sql_literal(row['exam_id'])}::uuid, "
        f"{sql_literal(row['question_id'])}::uuid, "
        f"{row['display_order']}"
        ")"
        for row in plan.exam_questions
    ]
    for group in chunked(exam_question_rows, 80):
        emit(
            "INSERT INTO testbank.exam_questions (exam_id, question_id, display_order)\nVALUES\n"
            + ",\n".join(group)
            + "\nON CONFLICT (exam_id, display_order) DO NOTHING;\n"
        )

    return files


def write_sql_chunks(batch_files: list[Path], out_dir: Path, max_bytes: int = MAX_CHUNK_BYTES) -> list[Path]:
    out_dir.mkdir(parents=True, exist_ok=True)
    for existing in out_dir.glob("chunk_*.sql"):
        existing.unlink()

    chunks: list[Path] = []
    buffer = ""
    chunk_index = 0

    def flush() -> None:
        nonlocal buffer, chunk_index
        if not buffer:
            return
        chunk_index += 1
        path = out_dir / f"chunk_{chunk_index:03d}.sql"
        path.write_text(buffer)
        chunks.append(path)
        buffer = ""

    for batch_file in sorted(batch_files):
        statement = batch_file.read_text()
        if not statement.strip():
            continue
        candidate = buffer + statement if buffer else statement
        if buffer and len(candidate.encode()) > max_bytes:
            flush()
            buffer = statement
        else:
            buffer = candidate
    flush()
    return chunks


def summarize(plan: ExamLoadPlan) -> dict:
    return {
        "exams": len(plan.exams),
        "exam_questions": len(plan.exam_questions),
        "unique_questions": len(plan.questions),
        "choices": len(plan.question_choices),
        "performance_indicators": len(plan.performance_indicators),
        "instructional_areas": len(plan.instructional_areas),
        "lap_modules": len(plan.lap_modules),
        "sources": len(plan.sources),
        "exam_events": len(plan.exam_events),
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--exam-dir", type=Path, default=EXAM_DIR)
    parser.add_argument("--sql-dir", type=Path, default=SQL_DIR)
    parser.add_argument("--summary-json", type=Path, default=ROOT / "data" / "exams" / "load_summary.json")
    args = parser.parse_args()

    plan = build_plan(args.exam_dir)
    stats = summarize(plan)
    args.summary_json.write_text(json.dumps(stats, indent=2))
    files = write_sql_batches(plan, args.sql_dir)
    chunks = write_sql_chunks(files, CHUNK_DIR)

    print(json.dumps(stats, indent=2))
    print(f"Wrote {len(files)} SQL batch files to {args.sql_dir}")
    print(f"Wrote {len(chunks)} SQL chunk files to {CHUNK_DIR}")


if __name__ == "__main__":
    main()
