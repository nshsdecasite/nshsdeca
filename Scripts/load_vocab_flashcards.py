#!/usr/bin/env python3
"""Load DECA business vocabulary into content.vocab_terms and content.flashcards."""

from __future__ import annotations

import json
import os
import re
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
VOCAB_TS = ROOT / "data" / "vocab-terms.ts"
SET_TITLE = "DECA Business Vocabulary"


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


def parse_vocab_terms() -> list[dict[str, str]]:
    text = VOCAB_TS.read_text(encoding="utf-8")
    pattern = re.compile(
        r'term:\s*"([^"]+)"\s*,\s*definition:\s*"([^"]+)"\s*,\s*instructionalAreaCode:\s*"([^"]+)"',
        re.MULTILINE,
    )
    return [
        {"term": term, "definition": definition, "code": code}
        for term, definition, code in pattern.findall(text)
    ]


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
    terms = parse_vocab_terms()
    if not terms:
        raise SystemExit(f"No vocab terms found in {VOCAB_TS}")

    conn = connect()
    conn.autocommit = True
    cur = conn.cursor()

    cur.execute(
        "SELECT id, code FROM practice.instructional_areas WHERE code = ANY(%s)",
        ([term["code"] for term in terms],),
    )
    ia_by_code = {code: ia_id for ia_id, code in cur.fetchall()}

    missing_codes = sorted({term["code"] for term in terms if term["code"] not in ia_by_code})
    if missing_codes:
        raise SystemExit(f"Missing instructional area codes: {', '.join(missing_codes)}")

    cur.execute(
        """
        SELECT id
        FROM core.users
        ORDER BY CASE WHEN email LIKE '%%officer%%' THEN 0 ELSE 1 END, created_at NULLS LAST
        LIMIT 1
        """
    )
    row = cur.fetchone()
    if not row:
        raise SystemExit("No core.users row found for flashcard_sets.created_by")
    created_by = row[0]

    cur.execute(
        """
        SELECT id
        FROM content.flashcard_sets
        WHERE title = %s AND set_type = 'vocab'
        LIMIT 1
        """,
        (SET_TITLE,),
    )
    existing_set = cur.fetchone()
    if existing_set:
        set_id = existing_set[0]
        cur.execute("DELETE FROM content.flashcards WHERE set_id = %s", (set_id,))
        print(f"Reusing flashcard set {set_id}")
    else:
        cur.execute(
            """
            INSERT INTO content.flashcard_sets (title, set_type, created_by)
            VALUES (%s, 'vocab', %s)
            RETURNING id
            """,
            (SET_TITLE, created_by),
        )
        set_id = cur.fetchone()[0]
        print(f"Created flashcard set {set_id}")

    cur.execute("DELETE FROM content.vocab_terms")
    deleted_vocab = cur.rowcount

    vocab_rows = [
        (term["term"], term["definition"], ia_by_code[term["code"]])
        for term in terms
    ]
    cur.executemany(
        """
        INSERT INTO content.vocab_terms (term, definition, instructional_area_id)
        VALUES (%s, %s, %s)
        """,
        vocab_rows,
    )

    flashcard_rows = [
        (set_id, term["term"], term["definition"]) for term in terms
    ]
    cur.executemany(
        """
        INSERT INTO content.flashcards (set_id, front_text, back_text)
        VALUES (%s, %s, %s)
        """,
        flashcard_rows,
    )

    cur.execute("SELECT COUNT(*) FROM content.vocab_terms")
    vocab_count = cur.fetchone()[0]
    cur.execute(
        "SELECT COUNT(*) FROM content.flashcards WHERE set_id = %s",
        (set_id,),
    )
    flashcard_count = cur.fetchone()[0]

    print(
        json.dumps(
            {
                "set_id": str(set_id),
                "set_title": SET_TITLE,
                "deleted_vocab_terms": deleted_vocab,
                "vocab_terms": vocab_count,
                "flashcards": flashcard_count,
            },
            indent=2,
        )
    )

    cur.close()
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
