#!/usr/bin/env python3
"""Load all MCP SQL chunks into Supabase Postgres and update batch_load_log."""

from __future__ import annotations

import json
import re
import subprocess
import sys
from pathlib import Path

import psycopg2

ROOT = Path(__file__).resolve().parents[1]
CHUNKS_DIR = ROOT / "data" / "exams" / "mcp_chunks"
MANIFEST = ROOT / "data" / "exams" / "mcp_chunk_manifest.json"
TRACKER = ROOT / "scripts" / "mcp_batch_tracker.py"
ENV_PATH = ROOT / ".env"
PROJECT_REF = "tfrwksqmuxrtqfehzuti"


def load_env() -> dict[str, str]:
    text = ENV_PATH.read_text()
    out: dict[str, str] = {}
    for line in text.splitlines():
        line = line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        k, v = line.split("=", 1)
        out[k.strip()] = v.strip().strip('"').strip("'")
    return out


def connect():
    env = load_env()
    password = env.get("SUPABASE_DB_PASSWORD", "")
    if not password:
        raise SystemExit("SUPABASE_DB_PASSWORD not set in .env")
    hosts = [
        ("aws-0-us-east-1.pooler.supabase.com", 6543, f"postgres.{PROJECT_REF}"),
        ("aws-0-us-west-1.pooler.supabase.com", 6543, f"postgres.{PROJECT_REF}"),
        (f"db.{PROJECT_REF}.supabase.co", 5432, "postgres"),
    ]
    last_err: Exception | None = None
    for host, port, user in hosts:
        try:
            return psycopg2.connect(
                host=host,
                port=port,
                dbname="postgres",
                user=user,
                password=password,
                connect_timeout=30,
            )
        except Exception as exc:  # noqa: BLE001
            last_err = exc
    raise SystemExit(f"Could not connect to Supabase Postgres: {last_err}")


def tracker(*args: str) -> dict | None:
    cmd = [sys.executable, str(TRACKER), *args]
    result = subprocess.run(cmd, capture_output=True, text=True, check=False)
    if result.returncode != 0:
        print(result.stderr, file=sys.stderr)
        return None
    if result.stdout.strip():
        try:
            return json.loads(result.stdout)
        except json.JSONDecodeError:
            return None
    return None


def chunk_names() -> list[str]:
    manifest = json.loads(MANIFEST.read_text())
    return [m["chunk"] for m in manifest]


def load_batch_individually(batches: list[str], conn) -> tuple[int, int]:
    ok = 0
    fail = 0
    for batch in batches:
        sql = subprocess.check_output(
            [sys.executable, str(TRACKER), "batch-sql", batch], text=True
        )
        try:
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
            tracker("batch-ok", batch)
            ok += 1
            print(f"  batch ok: {batch}")
        except Exception as exc:  # noqa: BLE001
            conn.rollback()
            tracker("batch-fail", batch, str(exc)[:500])
            fail += 1
            print(f"  batch fail: {batch}: {exc}")
    return ok, fail


def main() -> int:
    subprocess.check_call([sys.executable, str(TRACKER), "init"])
    names = chunk_names()
    print(f"Loading {len(names)} chunks...")
    conn = connect()
    conn.autocommit = False

    chunk_ok = 0
    chunk_fail = 0
    for i, name in enumerate(names, 1):
        path = CHUNKS_DIR / name
        sql = path.read_text()
        print(f"[{i}/{len(names)}] {name} ({len(sql)} bytes)")
        try:
            with conn.cursor() as cur:
                cur.execute(sql)
            conn.commit()
            tracker("chunk-ok", name)
            chunk_ok += 1
        except Exception as exc:  # noqa: BLE001
            conn.rollback()
            print(f"  chunk failed: {exc}")
            manifest = json.loads(MANIFEST.read_text())
            entry = next(m for m in manifest if m["chunk"] == name)
            tracker("chunk-fail", name, str(exc)[:500])
            chunk_fail += 1
            print(f"  retrying {len(entry['batches'])} batches individually...")
            load_batch_individually(entry["batches"], conn)

    conn.close()
    status = tracker("status")
    print(json.dumps(status, indent=2))
    return 0 if chunk_fail == 0 else 1


if __name__ == "__main__":
    raise SystemExit(main())
