#!/usr/bin/env python3
"""Apply numbered SQL batch files to Supabase with per-batch logging."""

from __future__ import annotations

import json
import sys
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
SQL_DIR = ROOT / "data" / "exams" / "sql_batches"
LOG_PATH = ROOT / "data" / "exams" / "batch_load_log.json"
ENV_PATH = ROOT / ".env"
PROJECT_ID = "tfrwksqmuxrtqfehzuti"
TOTAL_BATCHES = 700

VERIFY_SQL = """
SELECT 'exams' as t, count(*)::text FROM testbank.exams
UNION ALL SELECT 'questions', count(*)::text FROM testbank.questions
UNION ALL SELECT 'question_choices', count(*)::text FROM testbank.question_choices
UNION ALL SELECT 'exam_questions', count(*)::text FROM testbank.exam_questions
UNION ALL SELECT 'exam_events', count(*)::text FROM testbank.exam_events
UNION ALL SELECT 'sources', count(*)::text FROM testbank.sources;
"""


def load_env(path: Path) -> dict[str, str]:
    env: dict[str, str] = {}
    for line in path.read_text().splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        env[key.strip()] = value.strip()
    return env


def connect(env: dict[str, str]):
    password = env["SUPABASE_DB_PASSWORD"]
    host = f"db.{PROJECT_ID}.supabase.co"
    dsn = (
        f"host={host} port=5432 dbname=postgres user=postgres "
        f"password={password} sslmode=require connect_timeout=30"
    )
    return psycopg2.connect(dsn)


def write_log(log: dict) -> None:
    LOG_PATH.write_text(json.dumps(log, indent=2) + "\n")


def main() -> int:
    batches = sorted(SQL_DIR.glob("*.sql"), key=lambda p: int(p.stem))
    log = {"total": TOTAL_BATCHES, "success": 0, "failed_count": 0, "failed": []}
    write_log(log)

    conn = connect(load_env(ENV_PATH))
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            for idx, batch_path in enumerate(batches, start=1):
                try:
                    cur.execute(batch_path.read_text())
                    log["success"] += 1
                except Exception as exc:  # noqa: BLE001
                    log["failed_count"] += 1
                    log["failed"].append(
                        {"batch": batch_path.name, "error": str(exc).strip()}
                    )
                if idx % 25 == 0 or idx == len(batches):
                    write_log(log)
                    print(
                        f"progress {idx}/{len(batches)} "
                        f"success={log['success']} failed={log['failed_count']}",
                        flush=True,
                    )
    finally:
        conn.close()

    conn = connect(load_env(ENV_PATH))
    conn.autocommit = True
    try:
        with conn.cursor() as cur:
            cur.execute(VERIFY_SQL)
            log["verification"] = {row[0]: int(row[1]) for row in cur.fetchall()}
    except Exception as exc:  # noqa: BLE001
        log["verification_error"] = str(exc)
    finally:
        conn.close()

    write_log(log)
    print(json.dumps(log, indent=2))
    return 1 if log["failed_count"] else 0


if __name__ == "__main__":
    raise SystemExit(main())
