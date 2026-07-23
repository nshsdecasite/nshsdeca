#!/usr/bin/env python3
"""Load all exam SQL via Supabase Management API (same backend as MCP execute_sql).

Requires SUPABASE_ACCESS_TOKEN in environment (from https://supabase.com/dashboard/account/tokens).
Falls back to reporting chunks that need MCP manual execution.
"""

from __future__ import annotations

import json
import os
import re
import ssl
import subprocess
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
CHUNKS_DIR = ROOT / "data" / "exams" / "mcp_chunks"
MANIFEST = ROOT / "data" / "exams" / "mcp_chunk_manifest.json"
TRACKER = ROOT / "scripts" / "mcp_batch_tracker.py"
PROJECT_REF = "tfrwksqmuxrtqfehzuti"
API = "https://api.supabase.com/v1"


def tracker(*args: str) -> dict | None:
    cmd = [sys.executable, str(TRACKER), *args]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        print(r.stderr, file=sys.stderr)
        return None
    if r.stdout.strip():
        try:
            return json.loads(r.stdout)
        except json.JSONDecodeError:
            return None
    return None


def execute_sql(query: str, token: str) -> None:
    url = f"{API}/projects/{PROJECT_REF}/database/query"
    body = json.dumps({"query": query}).encode()
    req = urllib.request.Request(
        url,
        data=body,
        method="POST",
        headers={
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
        },
    )
    ctx = ssl.create_default_context()
    try:
        with urllib.request.urlopen(req, timeout=120, context=ctx) as resp:
            raw = resp.read().decode()
            if resp.status >= 400:
                raise RuntimeError(raw[:500])
    except urllib.error.HTTPError as exc:
        detail = exc.read().decode()[:500]
        raise RuntimeError(f"HTTP {exc.code}: {detail}") from exc


def load_batch_individually(batches: list[str], token: str) -> None:
    for batch in batches:
        sql = subprocess.check_output(
            [sys.executable, str(TRACKER), "batch-sql", batch], text=True
        )
        try:
            execute_sql(sql, token)
            tracker("batch-ok", batch)
            print(f"  batch ok: {batch}")
        except Exception as exc:  # noqa: BLE001
            tracker("batch-fail", batch, str(exc)[:500])
            print(f"  batch fail: {batch}: {exc}")


def main() -> int:
    token = os.environ.get("SUPABASE_ACCESS_TOKEN", "").strip()
    if not token:
        # try .env
        env_path = ROOT / ".env"
        if env_path.exists():
            m = re.search(r"^SUPABASE_ACCESS_TOKEN=(.*)$", env_path.read_text(), re.M)
            if m:
                token = m.group(1).strip().strip('"').strip("'")
    if not token:
        print("ERROR: Set SUPABASE_ACCESS_TOKEN to use bulk loader", file=sys.stderr)
        print("Get token: https://supabase.com/dashboard/account/tokens", file=sys.stderr)
        return 2

    subprocess.check_call([sys.executable, str(TRACKER), "init"])
    manifest = json.loads(MANIFEST.read_text())
    print(f"Loading {len(manifest)} chunks via Management API...")

    for i, entry in enumerate(manifest, 1):
        chunk = entry["chunk"]
        sql = (CHUNKS_DIR / chunk).read_text()
        print(f"[{i}/{len(manifest)}] {chunk} ({len(sql)} bytes)")
        try:
            execute_sql(sql, token)
            tracker("chunk-ok", chunk)
        except Exception as exc:  # noqa: BLE001
            print(f"  chunk failed: {exc}")
            tracker("chunk-fail", chunk, str(exc)[:500])
            print(f"  retrying {len(entry['batches'])} batches...")
            load_batch_individually(entry["batches"], token)

    print(json.dumps(tracker("status"), indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
