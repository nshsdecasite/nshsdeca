#!/usr/bin/env python3
"""Track and report SQL chunk load progress for MCP execute_sql workflow."""
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


def save_progress(progress: dict) -> None:
    PROGRESS_FILE.write_text(json.dumps(progress, indent=2))


def pending_chunks(progress: dict) -> list[int]:
    done = set(progress["succeeded"]) | set(progress["failed"].keys())
    return [n for n in range(1, MAX_CHUNK + 1) if n not in done]


def main() -> None:
    cmd = sys.argv[1] if len(sys.argv) > 1 else "status"
    progress = load_progress()

    if cmd == "status":
        pending = pending_chunks(progress)
        print(
            json.dumps(
                {
                    "succeeded": len(progress["succeeded"]),
                    "failed": len(progress["failed"]),
                    "pending": len(pending),
                    "next": pending[:10],
                }
            )
        )
        return

    if cmd == "read":
        n = int(sys.argv[2])
        path = CHUNKS_DIR / f"chunk_{n:03d}.sql"
        if not path.exists():
            raise SystemExit(f"missing {path}")
        sys.stdout.write(path.read_text())
        return

    if cmd == "mark-ok":
        n = int(sys.argv[2])
        if n not in progress["succeeded"]:
            progress["succeeded"].append(n)
            progress["succeeded"].sort()
        progress["failed"].pop(str(n), None)
        progress["failed"].pop(n, None)
        save_progress(progress)
        print(json.dumps({"marked": n, "succeeded": len(progress["succeeded"])}))
        return

    if cmd == "mark-fail":
        n = int(sys.argv[2])
        err = sys.argv[3] if len(sys.argv) > 3 else "unknown error"
        progress["failed"][str(n)] = err
        save_progress(progress)
        print(json.dumps({"marked_failed": n}))
        return

    raise SystemExit(f"unknown command: {cmd}")


if __name__ == "__main__":
    main()
