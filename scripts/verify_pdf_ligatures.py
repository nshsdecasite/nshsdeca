#!/usr/bin/env python3
"""Count rows still affected by PDF ligature corruption."""

from __future__ import annotations

import os
import sys
from pathlib import Path

import requests

sys.path.insert(0, str(Path(__file__).resolve().parent))


def load_env() -> tuple[str, str]:
    for line in Path(__file__).resolve().parents[1].joinpath(".env").read_text().splitlines():
        if "=" in line and not line.strip().startswith("#"):
            key, value = line.split("=", 1)
            os.environ.setdefault(key.strip(), value.strip())
    url = os.environ["SUPABASE_URL"].rstrip("/")
    key = os.environ["SUPABASE_SERVICE_ROLE_KEY"]
    return url, key


def count_sql(url: str, key: str, table: str, column: str) -> int:
    where = (
        f"{column} ~ '[a-zA-Z]5[a-z]' OR "
        f"{column} ~ '[a-zA-Z]\\([a-z]' OR "
        f"{column} ~ '[a-z]U[a-z]'"
    )
    sql = f"SELECT count(*)::int AS n FROM {table} WHERE {where};"
    response = requests.post(
        f"{url}/rest/v1/rpc/exec_bulk_sql",
        headers={
            "apikey": key,
            "Authorization": f"Bearer {key}",
            "Content-Type": "application/json",
            "Prefer": "return=representation",
        },
        json={"q": sql},
        timeout=60,
    )
    if response.status_code >= 400:
        raise RuntimeError(response.text)
    rows = response.json()
    if isinstance(rows, list) and rows:
        return int(rows[0].get("n", rows[0].get("count", 0)))
    return 0


def main() -> None:
    url, key = load_env()
    jobs = [
        ("practice.instructional_areas", "name"),
        ("practice.performance_indicators", "indicator_text"),
        ("rubric.rubric_criteria", "criterion_text"),
        ("testbank.questions", "question_text"),
        ("testbank.questions", "rationale"),
        ("testbank.question_choices", "choice_text"),
    ]
    total = 0
    for table, column in jobs:
        n = count_sql(url, key, table, column)
        total += n
        status = "OK" if n == 0 else "CORRUPT"
        print(f"{status:8} {n:5}  {table}.{column}")
    print(f"\nTotal corrupt rows: {total}")


if __name__ == "__main__":
    main()
