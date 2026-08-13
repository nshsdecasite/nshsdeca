#!/usr/bin/env python3
"""Parse and load DECA roleplay PDFs from the event-sorted folder."""

from __future__ import annotations

import argparse
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

import psycopg2

from roleplay_db_loader import (
    DEFAULT_SOURCE_URL,
    build_ia_lookup,
    build_pi_lookup,
    generate_load_sql,
)
from roleplay_parser import parse_roleplay_pdf

PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "tfrwksqmuxrtqfehzuti")
DEFAULT_ROOT = Path(__file__).resolve().parent / "roleplays (event sorted)"
SKIP_DIR_NAMES = {"unknown", "__pycache__"}

PI_LOOKUP_SQL = """
SELECT pi_code, indicator_text
FROM practice.performance_indicators
ORDER BY pi_code;
"""

IA_LOOKUP_SQL = """
SELECT code, name
FROM practice.instructional_areas
ORDER BY code;
"""

SUMMARY_SQL = """
SELECT e.event_code,
       COUNT(DISTINCT s.id)::int AS scenarios,
       COUNT(DISTINCT q.id)::int AS judge_questions,
       COUNT(DISTINCT CASE WHEN s.source_url = %s THEN s.id END)::int AS scenarios_with_source
FROM events.events e
LEFT JOIN events.scenarios s ON s.event_id = e.id
LEFT JOIN events.scenario_judge_questions q ON q.scenario_id = s.id
WHERE e.event_format IN ('roleplay_individual', 'roleplay_team')
GROUP BY e.event_code
ORDER BY e.event_code;
"""


def load_env() -> None:
    env_path = Path(__file__).resolve().parents[3] / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def connect():
    password = os.environ.get("SUPABASE_DB_PASSWORD", "")
    project_ref = os.environ.get("SUPABASE_PROJECT_REF", PROJECT_REF)
    if not password:
        raise SystemExit("SUPABASE_DB_PASSWORD is not set")
    return psycopg2.connect(
        host="aws-0-us-west-2.pooler.supabase.com",
        port=5432,
        dbname="postgres",
        user=f"postgres.{project_ref}",
        password=password,
        sslmode="require",
        connect_timeout=30,
    )


def discover_pdfs(target: Path) -> list[Path]:
    if target.is_file() and target.suffix.lower() == ".pdf":
        return [target.resolve()]
    if target.is_dir():
        pdfs = []
        for pdf_path in sorted(target.rglob("*.pdf")):
            if any(part.lower() in SKIP_DIR_NAMES for part in pdf_path.parts):
                continue
            pdfs.append(pdf_path)
        return pdfs
    raise FileNotFoundError(f"Target not found: {target}")


def summarize_parsed(parsed) -> dict:
    return {
        "event_code": parsed.event_code,
        "year": parsed.year,
        "level": parsed.level,
        "scenario_number": parsed.scenario_number,
        "instructional_area": parsed.instructional_area_name,
        "performance_indicator_count": len(parsed.performance_indicators),
        "judge_question_count": len(parsed.judge_questions),
        "rubric_criteria_count": len(parsed.rubric_criteria),
        "max_total_points": parsed.max_total_points,
        "has_solution": bool(parsed.solution_text),
        "source_url": DEFAULT_SOURCE_URL,
    }


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description="Load DECA roleplay PDFs into Supabase.")
    parser.add_argument(
        "target",
        nargs="?",
        default=DEFAULT_ROOT,
        help="Event folder, PDF file, or root roleplay directory (default: all events)",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Parse and print summary without writing to the database",
    )
    parser.add_argument(
        "--json-out",
        type=Path,
        help="Write parsed summaries to JSON",
    )
    parser.add_argument(
        "--source-url",
        default=DEFAULT_SOURCE_URL,
        help="Source URL stored on events.scenarios.source_url",
    )
    return parser


def main(argv: list[str] | None = None) -> int:
    load_env()
    args = build_parser().parse_args(argv)

    target = Path(args.target)
    if not target.is_absolute():
        target = (Path.cwd() / target).resolve()

    pdfs = discover_pdfs(target)
    if not pdfs:
        print(f"No PDFs found under {target}", file=sys.stderr)
        return 1

    print(f"Found {len(pdfs)} PDF(s) under {target}", flush=True)

    parsed_items = []
    failures: list[str] = []
    for pdf_path in pdfs:
        try:
            parsed = parse_roleplay_pdf(pdf_path)
            parsed_items.append(parsed)
        except Exception as exc:
            failures.append(f"{pdf_path.name}: {exc}")
            print(f"FAILED {pdf_path}: {exc}", file=sys.stderr)

    print(f"Parsed {len(parsed_items)} / {len(pdfs)} PDF(s)", flush=True)
    if failures:
        print(f"Failures: {len(failures)}", file=sys.stderr)

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(
            json.dumps([summarize_parsed(item) for item in parsed_items], indent=2),
            encoding="utf-8",
        )

    if args.dry_run or not parsed_items:
        return 0 if parsed_items else 1

    conn = connect()
    conn.autocommit = True
    cur = conn.cursor()
    cur.execute(PI_LOOKUP_SQL)
    pi_lookup = build_pi_lookup(cur.fetchall())
    cur.execute(IA_LOOKUP_SQL)
    ia_lookup = build_ia_lookup(cur.fetchall())

    loaded_by_event: dict[str, int] = defaultdict(int)
    for index, parsed in enumerate(parsed_items, start=1):
        batches, stats = generate_load_sql(
            parsed,
            pi_lookup=pi_lookup,
            ia_lookup=ia_lookup,
            source_url=args.source_url,
        )
        if index % 25 == 0 or index == len(parsed_items):
            print(
                f"[{index}/{len(parsed_items)}] {parsed.event_code} "
                f"{parsed.year} scenario {parsed.scenario_number}",
                flush=True,
            )
        if stats.unmatched_pis:
            for item in stats.unmatched_pis:
                print(f"  unmatched PI ({parsed.event_code}): {item}", file=sys.stderr)

        for batch in batches:
            cur.execute(f"BEGIN;\n\n{batch}\n\nCOMMIT;")

        loaded_by_event[parsed.event_code] += 1

    print("\nLoaded by event:", flush=True)
    for event_code in sorted(loaded_by_event):
        print(f"  {event_code}: {loaded_by_event[event_code]} scenarios", flush=True)

    print("\nDatabase summary:", flush=True)
    cur.execute(SUMMARY_SQL, (args.source_url,))
    for event_code, scenarios, questions, with_source in cur.fetchall():
        if scenarios:
            print(
                f"  {event_code}: scenarios={scenarios} questions={questions} "
                f"source_url_ok={with_source}",
                flush=True,
            )

    cur.close()
    conn.close()
    return 0 if not failures else 1


if __name__ == "__main__":
    raise SystemExit(main())
