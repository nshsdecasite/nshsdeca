"""Read SQL files from disk and print as JSON for MCP execute_sql payloads."""
from __future__ import annotations

import json
import sys
from pathlib import Path

PROJECT_ID = "tfrwksqmuxrtqfehzuti"


def main() -> None:
    if len(sys.argv) < 2:
        print("Usage: python apply_sql_files.py <sql-file> [<sql-file> ...]", file=sys.stderr)
        sys.exit(1)

    for path_str in sys.argv[1:]:
        path = Path(path_str)
        payload = {
            "project_id": PROJECT_ID,
            "query": path.read_text(encoding="utf-8"),
        }
        out = path.with_suffix(path.suffix + ".payload.json")
        out.write_text(json.dumps(payload), encoding="utf-8")
        print(out)


if __name__ == "__main__":
    main()
