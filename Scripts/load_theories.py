#!/usr/bin/env python3
"""Load DECA theories into content.theories."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
THEORIES_TS = ROOT / "data" / "theories.ts"


def load_env() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def parse_theories() -> list[dict[str, str]]:
    text = THEORIES_TS.read_text(encoding="utf-8")
    pattern = re.compile(
        r'theoryName:\s*"([^"]+)"\s*,\s*'
        r'category:\s*"([^"]+)"\s*,\s*'
        r'explanation:\s*"((?:[^"\\]|\\.)*)"\s*,\s*'
        r'exampleScenario:\s*"((?:[^"\\]|\\.)*)"\s*,\s*'
        r'clusterSlug:\s*"([^"]+)"',
        re.MULTILINE,
    )
    rows: list[dict[str, str]] = []
    for match in pattern.finditer(text):
        theory_name, category, explanation, example_scenario, cluster_slug = match.groups()
        rows.append(
            {
                "theory_name": theory_name.replace('\\"', '"'),
                "category": category,
                "explanation": explanation.replace('\\"', '"'),
                "example_scenario": example_scenario.replace('\\"', '"'),
                "cluster_slug": cluster_slug,
            }
        )
    return rows


def connect():
    password = os.environ.get("SUPABASE_DB_PASSWORD", "")
    project_ref = os.environ.get("SUPABASE_PROJECT_REF", "tfrwksqmuxrtqfehzuti")
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


def main() -> int:
    load_env()
    theory_rows = parse_theories()
    if not theory_rows:
        raise SystemExit(f"No theories found in {THEORIES_TS}")

    conn = connect()
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute("SELECT id, slug FROM practice.clusters")
    cluster_by_slug = {slug: cluster_id for cluster_id, slug in cur.fetchall()}

    missing_slugs = sorted(
        {
            row["cluster_slug"]
            for row in theory_rows
            if row["cluster_slug"] not in cluster_by_slug
        }
    )
    if missing_slugs:
        raise SystemExit(f"Missing cluster slugs: {', '.join(missing_slugs)}")

    cur.execute("DELETE FROM content.theories")
    deleted = cur.rowcount

    insert_rows = [
        (
            row["theory_name"],
            row["category"],
            row["explanation"],
            row["example_scenario"],
            cluster_by_slug[row["cluster_slug"]],
        )
        for row in theory_rows
    ]
    cur.executemany(
        """
        INSERT INTO content.theories (
            theory_name,
            category,
            explanation,
            example_scenario,
            cluster_id
        )
        VALUES (%s, %s, %s, %s, %s)
        """,
        insert_rows,
    )

    cur.execute("SELECT COUNT(*) FROM content.theories")
    count = cur.fetchone()[0]

    print(
        json.dumps(
            {
                "deleted_theories": deleted,
                "inserted_theories": len(insert_rows),
                "theories_in_db": count,
            },
            indent=2,
        )
    )

    cur.close()
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
