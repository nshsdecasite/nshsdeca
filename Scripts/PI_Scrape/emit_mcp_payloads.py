"""Execute Finance PI load SQL chunks via Supabase MCP execute_sql payloads."""
from __future__ import annotations

import json
import sys
from pathlib import Path

PROJECT_ID = "tfrwksqmuxrtqfehzuti"
CHUNK_FILES = [
    "mcp_02_03.sql.query.json",
    "mcp_04_05_06.sql.query.json",
    "mcp_07_08_09.sql.query.json",
    "mcp_10.sql.query.json",
]


def load_query(path: Path) -> str:
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    base = Path(__file__).resolve().parent / "output"
    missing = [name for name in CHUNK_FILES if not (base / name).exists()]
    if missing:
        print("Missing query files:", ", ".join(missing), file=sys.stderr)
        return 1

    for name in CHUNK_FILES:
        query = load_query(base / name)
        payload = {"project_id": PROJECT_ID, "query": query}
        print(json.dumps({"chunk": name, "chars": len(query), "payload": payload}))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
