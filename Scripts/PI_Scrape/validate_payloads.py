"""Execute generated SQL payload files against Supabase via MCP-compatible HTTP.

This script reads *.payload.json files produced by apply_sql_files.py and
prints execution order. Actual DB execution is done through Supabase MCP
execute_sql from the agent; this helper validates payloads and reports sizes.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path


def main() -> None:
    files = sys.argv[1:] or [
        "output/mcp_02_03.sql.payload.json",
        "output/mcp_04_05_06.sql.payload.json",
        "output/mcp_07_08_09.sql.payload.json",
        "output/mcp_10.sql.payload.json",
    ]
    for f in files:
        path = Path(f)
        payload = json.loads(path.read_text(encoding="utf-8"))
        print(f"{path.name}: {len(payload['query'])} chars")


if __name__ == "__main__":
    main()
