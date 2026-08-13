#!/usr/bin/env python3
"""Scrape DECA cluster PI PDFs and optionally load them into Supabase."""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path

from blueprint_router import parse_blueprint, summarize_blueprint


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(
        description=(
            "Parse a DECA career cluster Performance Indicators PDF and optionally "
            "load practice/events blueprint tables in Supabase."
        )
    )
    parser.add_argument(
        "pdf",
        type=Path,
        help="Path to the PI blueprint PDF (e.g. Finance_PIs.pdf)",
    )
    parser.add_argument(
        "--cluster-slug",
        help="Override cluster slug (defaults from PDF title, e.g. finance)",
    )
    parser.add_argument(
        "--source-url",
        help="Optional source URL stored on practice.pi_blueprints.source_url",
    )
    parser.add_argument(
        "--sql-out",
        type=Path,
        help="Write Supabase MCP SQL batches to this file (used with --load)",
    )
    parser.add_argument(
        "--json-out",
        type=Path,
        help="Write parsed JSON export to this file",
    )
    parser.add_argument(
        "--summary-out",
        type=Path,
        help="Write parse summary JSON to this file",
    )
    parser.add_argument(
        "--load",
        action="store_true",
        help="Generate SQL batches for Supabase MCP execute_sql",
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="With --load, only generate SQL (same as --load; apply via MCP separately)",
    )
    parser.add_argument(
        "--event-code",
        action="append",
        default=[],
        metavar="NAME=CODE",
        help="Manual event-name to event-code override for chart parsing",
    )
    return parser


def parse_manual_event_codes(values: list[str]) -> dict[str, str]:
    overrides: dict[str, str] = {}
    for item in values:
        if "=" not in item:
            raise ValueError(f"Invalid --event-code value: {item!r} (expected NAME=CODE)")
        name, code = item.split("=", 1)
        overrides[name.strip()] = code.strip().upper()
    return overrides


def blueprint_to_json(parsed) -> dict:
    from pi_parser import indicator_events, page_to_events
    from db_loader import slugify_cluster_name

    page_event_lookup = page_to_events(parsed.event_page_mappings)
    return {
        "cluster_name": parsed.cluster_name,
        "cluster_slug": slugify_cluster_name(parsed.cluster_name),
        "blueprint_title": parsed.blueprint_title,
        "blueprint_year": parsed.blueprint_year,
        "posted_date": parsed.posted_date,
        "source_path": parsed.source_path,
        "event_codes_from_cover": parsed.event_codes_from_cover,
        "event_page_mappings": [
            {
                "event_code": mapping.event_code,
                "event_name": mapping.event_name,
                "pathway_name": mapping.pathway_name,
                "exam_only": mapping.exam_only,
                "pages": sorted(mapping.page_numbers),
            }
            for mapping in parsed.event_page_mappings
        ],
        "instructional_areas": list(parsed.instructional_areas.values()),
        "performance_elements": parsed.performance_elements,
        "indicators": [
            {
                "pi_code": ind.pi_code,
                "indicator_text": ind.indicator_text,
                "tier_code": ind.tier_code,
                "instructional_area_code": ind.instructional_area_code,
                "performance_element_text": ind.performance_element_text,
                "element_display_order": ind.element_display_order,
                "blueprint_display_order": ind.blueprint_display_order,
                "pdf_page": ind.pdf_page,
                "section_name": ind.section_name,
                "event_codes": sorted(indicator_events(ind, page_event_lookup)),
            }
            for ind in parsed.indicators
        ],
    }


def main(argv: list[str] | None = None) -> int:
    parser = build_parser()
    args = parser.parse_args(argv)

    if not args.pdf.exists():
        parser.error(f"PDF not found: {args.pdf}")

    manual_codes = parse_manual_event_codes(args.event_code)
    parsed = parse_blueprint(args.pdf, manual_event_codes=manual_codes or None)
    summary = summarize_blueprint(parsed)

    print(json.dumps(summary, indent=2))

    if args.json_out:
        args.json_out.parent.mkdir(parents=True, exist_ok=True)
        args.json_out.write_text(
            json.dumps(blueprint_to_json(parsed), indent=2),
            encoding="utf-8",
        )
        print(f"Wrote parsed export to {args.json_out}", file=sys.stderr)

    if args.summary_out:
        args.summary_out.parent.mkdir(parents=True, exist_ok=True)
        args.summary_out.write_text(json.dumps(summary, indent=2), encoding="utf-8")
        print(f"Wrote summary to {args.summary_out}", file=sys.stderr)

    if args.load:
        from db_loader import load_blueprint

        stats = load_blueprint(
            parsed,
            cluster_slug=args.cluster_slug,
            source_url=args.source_url,
            sql_out=args.sql_out,
            dry_run=args.dry_run,
        )
        print(json.dumps(stats.__dict__, indent=2))
        print(
            f"Generated {stats.sql_batches} SQL batch(es) at {stats.sql_path}. "
            "Apply with Supabase MCP execute_sql.",
            file=sys.stderr,
        )

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
