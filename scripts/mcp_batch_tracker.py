#!/usr/bin/env python3
"""Track SQL batch load progress for MCP chunk execution."""

from __future__ import annotations

import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SQL_DIR = ROOT / "data" / "exams" / "sql_batches"
CHUNK_MANIFEST = ROOT / "data" / "exams/mcp_chunk_manifest.json"
LOG_PATH = ROOT / "data" / "exams/batch_load_log.json"
TOTAL = 700


def load_log() -> dict:
    if LOG_PATH.exists():
        return json.loads(LOG_PATH.read_text())
    return {"total": TOTAL, "success": 0, "failed_count": 0, "failed": []}


def save_log(log: dict) -> None:
    LOG_PATH.write_text(json.dumps(log, indent=2) + "\n")


def mark_chunk_result(chunk_name: str, ok: bool, error: str | None = None) -> dict:
    manifest = json.loads(CHUNK_MANIFEST.read_text())
    entry = next(m for m in manifest if m["chunk"] == chunk_name)
    log = load_log()
    if ok:
        log["success"] += len(entry["batches"])
    else:
        for batch in entry["batches"]:
            log["failed_count"] += 1
            log["failed"].append({"batch": batch, "error": error or "chunk failed"})
    save_log(log)
    return log


def mark_batch_result(batch: str, ok: bool, error: str | None = None) -> dict:
    log = load_log()
    if ok:
        log["success"] += 1
    else:
        log["failed_count"] += 1
        log["failed"].append({"batch": batch, "error": error or "unknown error"})
    save_log(log)
    return log


def read_chunk_sql(chunk_name: str) -> str:
    return (ROOT / "data/exams/mcp_chunks" / chunk_name).read_text()


def read_batch_sql(batch_name: str) -> str:
    return (SQL_DIR / batch_name).read_text()


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: mcp_batch_tracker.py <command> ...", file=sys.stderr)
        return 2
    cmd = sys.argv[1]
    if cmd == "init":
        save_log({"total": TOTAL, "success": 0, "failed_count": 0, "failed": []})
        print("initialized")
        return 0
    if cmd == "chunk-sql" and len(sys.argv) == 3:
        print(read_chunk_sql(sys.argv[2]), end="")
        return 0
    if cmd == "batch-sql" and len(sys.argv) == 3:
        print(read_batch_sql(sys.argv[2]), end="")
        return 0
    if cmd == "chunk-ok" and len(sys.argv) == 3:
        print(json.dumps(mark_chunk_result(sys.argv[2], True)))
        return 0
    if cmd == "chunk-fail" and len(sys.argv) >= 4:
        print(json.dumps(mark_chunk_result(sys.argv[2], False, sys.argv[3])))
        return 0
    if cmd == "batch-ok" and len(sys.argv) == 3:
        print(json.dumps(mark_batch_result(sys.argv[2], True)))
        return 0
    if cmd == "batch-fail" and len(sys.argv) >= 4:
        print(json.dumps(mark_batch_result(sys.argv[2], False, sys.argv[3])))
        return 0
    if cmd == "status":
        print(json.dumps(load_log(), indent=2))
        return 0
    if cmd == "list-chunks":
        manifest = json.loads(CHUNK_MANIFEST.read_text())
        for m in manifest:
            print(m["chunk"], len(m["batches"]), m["size"])
        return 0
    print(f"unknown command: {cmd}", file=sys.stderr)
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
