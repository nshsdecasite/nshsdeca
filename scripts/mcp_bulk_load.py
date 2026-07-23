#!/usr/bin/env python3
"""Split SQL chunk files into INSERT statements for MCP execute_sql loading."""
from __future__ import annotations

import re
import sys
from pathlib import Path

CHUNKS_DIR = Path(__file__).resolve().parents[1] / "data" / "exams" / "sql_chunks"
OUT_DIR = Path("/tmp/sql_statements")
MAX_CHUNK = 229


def split_sql_file(sql: str) -> list[str]:
    parts: list[str] = []
    current: list[str] = []
    for line in sql.splitlines(True):
        if line.startswith("INSERT INTO") and current:
            parts.append("".join(current))
            current = [line]
        else:
            current.append(line)
    if current:
        parts.append("".join(current))
    return [p for p in parts if p.strip()]


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    manifest = []
    idx = 0
    for n in range(1, MAX_CHUNK + 1):
        path = CHUNKS_DIR / f"chunk_{n:03d}.sql"
        if not path.exists():
            continue
        sql = path.read_text()
        statements = split_sql_file(sql)
        for s_i, stmt in enumerate(statements, 1):
            idx += 1
            out = OUT_DIR / f"stmt_{idx:05d}.sql"
            out.write_text(stmt)
            manifest.append(
                {
                    "idx": idx,
                    "chunk": n,
                    "stmt_in_chunk": s_i,
                    "file": str(out),
                    "bytes": len(stmt.encode()),
                }
            )
    manifest_path = OUT_DIR / "manifest.json"
    import json

    manifest_path.write_text(json.dumps(manifest, indent=2))
    print(json.dumps({"statements": len(manifest), "manifest": str(manifest_path)}))


if __name__ == "__main__":
    main()
