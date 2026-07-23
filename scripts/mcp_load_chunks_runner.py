#!/usr/bin/env python3
"""Helper for MCP chunk loading: split chunks, track progress, emit next work."""
from __future__ import annotations

import json
import sys
from pathlib import Path

CHUNKS_DIR = Path(__file__).resolve().parents[1] / "data" / "exams" / "sql_chunks"
PROGRESS_FILE = Path("/tmp/chunk_load_progress.json")
MAX_CHUNK = 229


def load_progress() -> dict:
    if PROGRESS_FILE.exists():
        return json.loads(PROGRESS_FILE.read_text())
    return {"succeeded": [], "failed": {}}


def pending(progress: dict) -> list[int]:
    done = set(progress["succeeded"]) | {int(k) for k in progress["failed"]}
    return [n for n in range(1, MAX_CHUNK + 1) if n not in done]


def chunk_sql(n: int) -> str:
    path = CHUNKS_DIR / f"chunk_{n:03d}.sql"
    if not path.exists():
        raise FileNotFoundError(path)
    return path.read_text()


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    progress = load_progress()

    if cmd == "status":
        pend = pending(progress)
        print(
            json.dumps(
                {
                    "succeeded": len(progress["succeeded"]),
                    "failed": len(progress["failed"]),
                    "pending": len(pend),
                    "next": pend[:20],
                    "failed_chunks": progress["failed"],
                },
                indent=2,
            )
        )
        return

    if cmd == "sql":
        n = int(sys.argv[2])
        sys.stdout.write(chunk_sql(n))
        return

    if cmd == "batch":
        count = int(sys.argv[2]) if len(sys.argv) > 2 else 5
        pend = pending(progress)[:count]
        out = []
        for n in pend:
            sql = chunk_sql(n)
            out.append({"chunk": n, "bytes": len(sql), "sql": sql})
        print(json.dumps(out))
        return

    raise SystemExit(f"unknown: {cmd}")


if __name__ == "__main__":
    main()
