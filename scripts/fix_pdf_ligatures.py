#!/usr/bin/env python3
"""Apply PDF ligature fixes to Supabase in batches."""

from __future__ import annotations

import os
import sys
import time
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))

BATCH = 400


def load_env() -> tuple[str, str]:
    for line in Path(__file__).resolve().parents[1].joinpath(".env").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())
    url = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return url, key


def exec_sql(url: str, key: str, sql: str) -> None:
    response = requests.post(
        f"{url}/rest/v1/rpc/exec_bulk_sql",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
        },
        json={"q": sql},
        timeout=120,
    )
    if response.status_code >= 400:
        raise RuntimeError(response.text)


def count_corrupt(url: str, key: str, table: str, column: str) -> int:
    where = (
        f"{column} ~ '[a-zA-Z]5[a-z]' OR "
        f"{column} ~ '[a-zA-Z]\\([a-z]' OR "
        f"{column} ~ '[a-z]U[a-z]'"
    )
    response = requests.post(
        f"{url}/rest/v1/rpc/exec_bulk_sql",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        json={"q": f"SELECT count(*)::int AS n FROM {table} WHERE {where};"},
        timeout=60,
    )
    if response.status_code >= 400:
        raise RuntimeError(response.text)
    rows = response.json()
    if isinstance(rows, list) and rows:
        return int(rows[0].get("n", rows[0].get("count", 0)))
    return 0


def batch_fix(url: str, key: str, table: str, column: str) -> None:
    where = (
        f"{column} ~ '[a-zA-Z]5[a-z]' OR "
        f"{column} ~ '[a-zA-Z]\\([a-z]' OR "
        f"{column} ~ '[a-z]U[a-z]'"
    )
    sql = f"""
    WITH batch AS (
        SELECT id
        FROM {table}
        WHERE {where}
        ORDER BY id
        LIMIT {BATCH}
    )
    UPDATE {table} t
    SET {column} = practice.fix_pdf_ligatures({column})
    FROM batch
    WHERE t.id = batch.id;
    """
    exec_sql(url, key, sql)


def main() -> None:
    url, key = load_env()

    print("Ensuring fix function exists...")
    function_sql = (
        Path(__file__).resolve().parents[1]
        .joinpath("supabase/migrations/20260724170000_fix_pdf_ligature_corruption.sql")
        .read_text()
        .split("-- Instructional areas")[0]
    )
    exec_sql(url, key, function_sql)

    jobs = [
        ("practice.instructional_areas", "name"),
        ("practice.performance_indicators", "indicator_text"),
        ("rubric.rubric_criteria", "criterion_text"),
        ("testbank.questions", "question_text"),
        ("testbank.questions", "rationale"),
        ("testbank.question_choices", "choice_text"),
    ]

    for table, column in jobs:
        remaining = count_corrupt(url, key, table, column)
        if remaining == 0:
            print(f"OK {table}.{column}")
            continue
        print(f"Fixing {table}.{column} ({remaining} rows)...", flush=True)
        rounds = 0
        while remaining > 0 and rounds < 500:
            batch_fix(url, key, table, column)
            rounds += 1
            time.sleep(0.1)
            remaining = count_corrupt(url, key, table, column)
            if rounds % 5 == 0 or remaining == 0:
                print(f"  round {rounds}, {remaining} remaining", flush=True)
        if remaining > 0:
            print(f"  WARNING: {remaining} rows still corrupt in {table}.{column}", flush=True)

    print("Re-linking rubric pi_id...")
    exec_sql(
        url,
        key,
        """
        UPDATE rubric.rubric_criteria rc
        SET pi_id = pi.id
        FROM practice.performance_indicators pi
        WHERE rc.criterion_group = 'performance_indicator'
          AND practice.normalize_pi_text(rc.criterion_text) = practice.normalize_pi_text(pi.indicator_text)
          AND (rc.pi_id IS NULL OR rc.pi_id <> pi.id);
        """,
    )

    print("Done.")


if __name__ == "__main__":
    main()
