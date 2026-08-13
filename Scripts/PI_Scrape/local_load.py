"""Execute PI blueprint load against Supabase via session pooler (local psycopg2)."""
from __future__ import annotations

import os
import sys
from pathlib import Path

import psycopg2

from blueprint_router import parse_blueprint
from db_loader import generate_load_sql, slugify_cluster_name

PROJECT_REF = os.environ.get("SUPABASE_PROJECT_REF", "tfrwksqmuxrtqfehzuti")
DB_PASSWORD = os.environ.get("SUPABASE_DB_PASSWORD", "")

VERIFY_SQL = """
SELECT c.slug, pb.title,
       (SELECT COUNT(*)::int FROM practice.blueprint_performance_indicators bpi WHERE bpi.blueprint_id = pb.id) AS bpi_count,
       (SELECT COUNT(*)::int FROM practice.blueprint_pi_events bpe
        JOIN practice.blueprint_performance_indicators bpi ON bpi.id = bpe.blueprint_pi_id
        WHERE bpi.blueprint_id = pb.id) AS bpe_count
FROM practice.pi_blueprints pb
JOIN practice.clusters c ON c.id = pb.cluster_id
ORDER BY c.slug;
"""


def load_env() -> None:
    env_path = Path(__file__).resolve().parents[2] / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def connect():
    password = os.environ.get("SUPABASE_DB_PASSWORD", DB_PASSWORD)
    project_ref = os.environ.get("SUPABASE_PROJECT_REF", PROJECT_REF)
    if not password:
        raise SystemExit("SUPABASE_DB_PASSWORD is not set")
    return psycopg2.connect(
        host="aws-0-us-west-2.pooler.supabase.com",
        port=5432,
        dbname="postgres",
        user=f"postgres.{project_ref}",
        password=password,
        sslmode="require",
        connect_timeout=30,
    )


def main() -> int:
    load_env()

    start_batch = 1
    args = [arg for arg in sys.argv[1:] if not arg.startswith("-")]
    if args and args[0].isdigit():
        start_batch = int(args.pop(0))

    base = Path(__file__).resolve().parent
    pdf_path = Path(args[0]) if args else base / "Finance_PIs.pdf"
    if not pdf_path.is_absolute():
        pdf_path = (Path.cwd() / pdf_path).resolve()
    if not pdf_path.exists():
        print(f"Missing PDF: {pdf_path}", file=sys.stderr)
        return 1

    print(f"Parsing {pdf_path.name}...", flush=True)
    parsed = parse_blueprint(pdf_path)
    cluster_slug = slugify_cluster_name(parsed.cluster_name)
    batches, stats = generate_load_sql(parsed, cluster_slug=cluster_slug)
    print(
        f"Cluster={parsed.cluster_name} slug={cluster_slug} "
        f"batches={len(batches)} IA={stats.instructional_areas} "
        f"PE={stats.performance_elements} PI={stats.performance_indicators} "
        f"BPI={stats.blueprint_performance_indicators} BPIE={stats.blueprint_pi_events}",
        flush=True,
    )

    conn = connect()
    conn.autocommit = True
    cur = conn.cursor()

    for index, batch in enumerate(batches, start=1):
        if index < start_batch:
            continue
        sql = f"BEGIN;\n\n{batch}\n\nCOMMIT;"
        print(f"Executing batch {index}/{len(batches)} ({len(sql)} chars)...", flush=True)
        cur.execute(sql)
        print("  OK", flush=True)

    print("\nBlueprint verification:", flush=True)
    cur.execute(VERIFY_SQL)
    for slug, title, bpi_count, bpe_count in cur.fetchall():
        print(f"  {slug}: title={title!r} bpi={bpi_count} bpe={bpe_count}")

    cur.close()
    conn.close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
