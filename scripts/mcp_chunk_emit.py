#!/usr/bin/env python3
"""Emit next chunk SQL for MCP execute_sql loading."""

from __future__ import annotations

import json
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
TRACKER = ROOT / "scripts" / "mcp_batch_tracker.py"
MANIFEST = ROOT / "data" / "exams" / "mcp_chunk_manifest.json"
STATE = ROOT / "data" / "exams/mcp_load_state.json"


def load_state() -> dict:
    if STATE.exists():
        return json.loads(STATE.read_text())
    return {"next_index": 0, "done": []}


def save_state(state: dict) -> None:
    STATE.write_text(json.dumps(state, indent=2) + "\n")


def chunks() -> list[str]:
    return [m["chunk"] for m in json.loads(MANIFEST.read_text())]


def main() -> int:
    if len(sys.argv) < 2:
        print("usage: mcp_chunk_emit.py next|mark-ok CHUNK|mark-fail CHUNK ERR|status", file=sys.stderr)
        return 2
    cmd = sys.argv[1]
    if cmd == "status":
        print(json.dumps({"state": load_state(), "log": json.loads(subprocess.check_output([sys.executable, str(TRACKER), "status"], text=True))}, indent=2))
        return 0
    if cmd == "next":
        state = load_state()
        names = chunks()
        if state["next_index"] >= len(names):
            print("DONE")
            return 0
        chunk = names[state["next_index"]]
        sql = subprocess.check_output([sys.executable, str(TRACKER), "chunk-sql", chunk], text=True)
        print(json.dumps({"chunk": chunk, "index": state["next_index"] + 1, "total": len(names), "sql": sql}))
        return 0
    if cmd == "mark-ok" and len(sys.argv) == 3:
        chunk = sys.argv[2]
        subprocess.check_call([sys.executable, str(TRACKER), "chunk-ok", chunk])
        state = load_state()
        names = chunks()
        if state["next_index"] < len(names) and names[state["next_index"]] == chunk:
            state["next_index"] += 1
        state["done"].append(chunk)
        save_state(state)
        print(json.dumps(state))
        return 0
    if cmd == "mark-fail" and len(sys.argv) >= 4:
        chunk, err = sys.argv[2], sys.argv[3]
        subprocess.check_call([sys.executable, str(TRACKER), "chunk-fail", chunk, err])
        state = load_state()
        if state["next_index"] < len(chunks()) and chunks()[state["next_index"]] == chunk:
            state["next_index"] += 1
        save_state(state)
        print(json.dumps(state))
        return 0
    return 2


if __name__ == "__main__":
    raise SystemExit(main())
