"""Generate SQL to load parsed PI blueprint data into Supabase via MCP."""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from textwrap import dedent

from pi_parser import ParsedBlueprint, indicator_events, page_to_events


@dataclass
class LoadStats:
    instructional_areas: int = 0
    performance_elements: int = 0
    performance_indicators: int = 0
    blueprint_events: int = 0
    blueprint_performance_indicators: int = 0
    blueprint_pi_events: int = 0
    sql_batches: int = 0
    sql_path: str | None = None


CLUSTER_SLUG_OVERRIDES = {
    "Finance": "finance",
    "Entrepreneurship": "entrepreneurship",
    "Marketing": "marketing",
    "Hospitality And Tourism": "hospitality-and-tourism",
    "Hospitality and Tourism": "hospitality-and-tourism",
    "Business Management And Administration": "business-management-and-administration",
    "Business Management and Administration": "business-management-and-administration",
    "Principles": "principles",
    "Personal Financial Literacy": "personal-financial-literacy",
}


def slugify_cluster_name(cluster_name: str) -> str:
    if cluster_name in CLUSTER_SLUG_OVERRIDES:
        return CLUSTER_SLUG_OVERRIDES[cluster_name]
    return cluster_name.lower().replace(" ", "-").replace("&", "and")


def sql_literal(value: str | int | None) -> str:
    if value is None:
        return "NULL"
    if isinstance(value, int):
        return str(value)
    text = (
        str(value)
        .replace("\u2019", "'")
        .replace("\u2018", "'")
        .replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("'", "''")
    )
    return f"'{text}'"


GRADE_TIER_CODES = ("G4", "G8", "G12")


def ensure_grade_tiers_sql() -> str:
    return dedent(
        """
        INSERT INTO practice.pi_tiers (code, label) VALUES
          ('G4', 'Grade 4'),
          ('G8', 'Grade 8'),
          ('G12', 'Grade 12')
        ON CONFLICT (code) DO UPDATE SET label = EXCLUDED.label;
        """
    ).strip()


def uses_grade_tiers(parsed: ParsedBlueprint) -> bool:
    return any(indicator.tier_code in GRADE_TIER_CODES for indicator in parsed.indicators)


def chunk_lines(lines: list[str], size: int) -> list[list[str]]:
    return [lines[i : i + size] for i in range(0, len(lines), size)]


    return [lines[i : i + size] for i in range(0, len(lines), size)]


def generate_load_sql(
    parsed: ParsedBlueprint,
    *,
    cluster_slug: str | None = None,
    source_url: str | None = None,
) -> tuple[list[str], LoadStats]:
    """Return SQL batches suitable for Supabase MCP execute_sql."""
    stats = LoadStats()
    slug = cluster_slug or slugify_cluster_name(parsed.cluster_name)
    page_event_lookup = page_to_events(parsed.event_page_mappings)
    title = parsed.cluster_name
    batches: list[str] = []

    if uses_grade_tiers(parsed):
        batches.append(ensure_grade_tiers_sql())

    ia_rows: list[str] = []
    for code, ia in parsed.instructional_areas.items():
        ia_rows.append(
            f"({sql_literal(code)}, {sql_literal(ia['name'])}, "
            f"{sql_literal(ia.get('standard_text') or None)})"
        )
        stats.instructional_areas += 1

    if ia_rows:
        batches.append(
            dedent(
                f"""
                INSERT INTO practice.instructional_areas (code, name, standard_text)
                VALUES {", ".join(ia_rows)}
                ON CONFLICT (code) DO UPDATE SET
                  name = EXCLUDED.name,
                  standard_text = COALESCE(
                    EXCLUDED.standard_text,
                    practice.instructional_areas.standard_text
                  );
                """
            ).strip()
        )

    seen_elements: set[tuple[str, str]] = set()
    element_rows: list[str] = []
    for element in parsed.performance_elements:
        ia_code = element["instructional_area_code"]
        if not ia_code:
            continue
        element_key = (ia_code, element["element_text"])
        if element_key in seen_elements:
            continue
        seen_elements.add(element_key)
        element_rows.append(
            f"({sql_literal(ia_code)}, {sql_literal(element['element_text'])}, "
            f"{element['display_order']})"
        )
        stats.performance_elements += 1

    for chunk in chunk_lines(element_rows, 200):
        batches.append(
            dedent(
                f"""
                INSERT INTO practice.performance_elements (
                  instructional_area_id, element_text, display_order
                )
                SELECT ia.id, v.element_text, v.display_order
                FROM (VALUES {", ".join(chunk)}) AS v(ia_code, element_text, display_order)
                JOIN practice.instructional_areas ia ON ia.code = v.ia_code
                ON CONFLICT (instructional_area_id, element_text) DO UPDATE SET
                  display_order = EXCLUDED.display_order;
                """
            ).strip()
        )

    seen_pi_codes: set[str] = set()
    pi_rows: list[str] = []
    for indicator in parsed.indicators:
        if indicator.pi_code in seen_pi_codes:
            continue
        seen_pi_codes.add(indicator.pi_code)
        pi_rows.append(
            f"({sql_literal(indicator.pi_code)}, {sql_literal(indicator.indicator_text)}, "
            f"{sql_literal(indicator.instructional_area_code)}, "
            f"{sql_literal(indicator.performance_element_text or None)})"
        )
        stats.performance_indicators += 1

    for chunk in chunk_lines(pi_rows, 200):
        batches.append(
            dedent(
                f"""
                INSERT INTO practice.performance_indicators (
                  pi_code, indicator_text, performance_element_id
                )
                SELECT
                  v.pi_code,
                  v.indicator_text,
                  pe.id
                FROM (VALUES {", ".join(chunk)}) AS v(
                  pi_code, indicator_text, ia_code, element_text
                )
                LEFT JOIN practice.instructional_areas ia ON ia.code = v.ia_code
                LEFT JOIN practice.performance_elements pe
                  ON pe.instructional_area_id = ia.id
                 AND pe.element_text = v.element_text
                ON CONFLICT (pi_code) DO UPDATE SET
                  indicator_text = EXCLUDED.indicator_text,
                  performance_element_id = COALESCE(
                    EXCLUDED.performance_element_id,
                    practice.performance_indicators.performance_element_id
                  );
                """
            ).strip()
        )

    batches.append(
        dedent(
            f"""
            WITH cluster AS (
              SELECT id FROM practice.clusters WHERE slug = {sql_literal(slug)}
            ),
            upserted AS (
              INSERT INTO practice.pi_blueprints (
                title, year, cluster_id, posted_date, source_url
              )
              SELECT
                {sql_literal(title)},
                {sql_literal(parsed.blueprint_year)},
                cluster.id,
                {sql_literal(parsed.posted_date)}::date,
                {sql_literal(source_url)}
              FROM cluster
              WHERE NOT EXISTS (
                SELECT 1
                FROM practice.pi_blueprints pb
                JOIN cluster ON cluster.id = pb.cluster_id
              )
              RETURNING id
            ),
            existing AS (
              SELECT pb.id
              FROM practice.pi_blueprints pb
              JOIN cluster ON cluster.id = pb.cluster_id
              LIMIT 1
            ),
            blueprint AS (
              SELECT id FROM upserted
              UNION ALL
              SELECT id FROM existing
              LIMIT 1
            )
            UPDATE practice.pi_blueprints pb
            SET
              title = {sql_literal(title)},
              posted_date = COALESCE({sql_literal(parsed.posted_date)}::date, pb.posted_date),
              source_url = COALESCE({sql_literal(source_url)}, pb.source_url)
            WHERE pb.id = (SELECT id FROM blueprint);
            """
        ).strip()
    )

    event_codes = [mapping.event_code for mapping in parsed.event_page_mappings]
    stats.blueprint_events = len(event_codes)
    if event_codes:
        event_values = ", ".join(f"({sql_literal(code)})" for code in event_codes)
        batches.append(
            dedent(
                f"""
                INSERT INTO practice.blueprint_events (blueprint_id, event_id)
                SELECT blueprint.id, e.id
                FROM (VALUES {event_values}) AS v(event_code)
                JOIN events.events e ON e.event_code = v.event_code
                JOIN practice.clusters c ON c.id = e.cluster_id AND c.slug = {sql_literal(slug)}
                CROSS JOIN (
                  SELECT pb.id
                  FROM practice.pi_blueprints pb
                  JOIN practice.clusters c ON c.id = pb.cluster_id
                  WHERE c.slug = {sql_literal(slug)}
                  LIMIT 1
                ) AS blueprint
                ON CONFLICT (blueprint_id, event_id) DO NOTHING;
                """
            ).strip()
        )

    seen_bpi_codes: set[str] = set()
    bpi_rows: list[str] = []
    for indicator in parsed.indicators:
        if indicator.pi_code in seen_bpi_codes:
            continue
        seen_bpi_codes.add(indicator.pi_code)
        bpi_rows.append(
            f"({sql_literal(indicator.pi_code)}, {sql_literal(indicator.tier_code)}, "
            f"{indicator.blueprint_display_order})"
        )
        stats.blueprint_performance_indicators += 1

    if bpi_rows:
        batches.append(
            dedent(
                f"""
                INSERT INTO practice.blueprint_performance_indicators (
                  blueprint_id, pi_id, tier_id, display_order
                )
                SELECT
                  blueprint.id,
                  pi.id,
                  tier.id,
                  v.display_order
                FROM (VALUES {", ".join(bpi_rows)}) AS v(pi_code, tier_code, display_order)
                JOIN practice.performance_indicators pi ON pi.pi_code = v.pi_code
                JOIN practice.pi_tiers tier ON tier.code = v.tier_code
                CROSS JOIN (
                  SELECT pb.id
                  FROM practice.pi_blueprints pb
                  JOIN practice.clusters c ON c.id = pb.cluster_id
                  WHERE c.slug = {sql_literal(slug)}
                  LIMIT 1
                ) AS blueprint
                ON CONFLICT (blueprint_id, pi_id) DO UPDATE SET
                  tier_id = EXCLUDED.tier_id,
                  display_order = EXCLUDED.display_order;
                """
            ).strip()
        )

    seen_pi_events: set[tuple[str, str]] = set()
    pi_event_rows: list[str] = []
    for indicator in parsed.indicators:
        for event_code in sorted(indicator_events(indicator, page_event_lookup)):
            pi_event_key = (indicator.pi_code, event_code)
            if pi_event_key in seen_pi_events:
                continue
            seen_pi_events.add(pi_event_key)
            pi_event_rows.append(
                f"({sql_literal(indicator.pi_code)}, {sql_literal(event_code)})"
            )
            stats.blueprint_pi_events += 1

    if pi_event_rows:
        batches.append(
            dedent(
                f"""
                INSERT INTO practice.blueprint_pi_events (blueprint_pi_id, event_id)
                SELECT bpi.id, e.id
                FROM (VALUES {", ".join(pi_event_rows)}) AS v(pi_code, event_code)
                JOIN practice.performance_indicators pi ON pi.pi_code = v.pi_code
                JOIN practice.blueprint_performance_indicators bpi ON bpi.pi_id = pi.id
                JOIN practice.pi_blueprints pb ON pb.id = bpi.blueprint_id
                JOIN practice.clusters c ON c.id = pb.cluster_id AND c.slug = {sql_literal(slug)}
                JOIN events.events e ON e.event_code = v.event_code
                WHERE c.slug = {sql_literal(slug)}
                ON CONFLICT (blueprint_pi_id, event_id) DO NOTHING;
                """
            ).strip()
        )

    stats.sql_batches = len(batches)
    return batches, stats


def generate_combined_sql(
    parsed: ParsedBlueprint,
    *,
    cluster_slug: str | None = None,
    source_url: str | None = None,
) -> tuple[str, LoadStats]:
    batches, stats = generate_load_sql(
        parsed,
        cluster_slug=cluster_slug,
        source_url=source_url,
    )
    combined = "BEGIN;\n\n" + "\n\n".join(batches) + "\n\nCOMMIT;"
    return combined, stats


def split_sql_for_mcp(sql: str, max_chars: int = 80_000) -> list[str]:
    """Split a transaction into a few MCP-safe chunks, each wrapped in BEGIN/COMMIT."""
    if len(sql) <= max_chars:
        return [sql]

    inner = sql.removeprefix("BEGIN;\n").removesuffix("\nCOMMIT;").strip()
    statements = [part.strip() for part in inner.split(";\n\n") if part.strip()]
    chunks: list[str] = []
    current: list[str] = []
    size = 0

    for statement in statements:
        statement_sql = statement if statement.endswith(";") else statement + ";"
        if current and size + len(statement_sql) + 2 > max_chars:
            chunks.append("BEGIN;\n\n" + "\n\n".join(current) + "\n\nCOMMIT;")
            current = [statement_sql]
            size = len(statement_sql)
        else:
            current.append(statement_sql)
            size += len(statement_sql) + 2

    if current:
        chunks.append("BEGIN;\n\n" + "\n\n".join(current) + "\n\nCOMMIT;")
    return chunks


def write_load_sql(
    parsed: ParsedBlueprint,
    sql_out: Path,
    *,
    cluster_slug: str | None = None,
    source_url: str | None = None,
) -> LoadStats:
    combined, stats = generate_combined_sql(
        parsed,
        cluster_slug=cluster_slug,
        source_url=source_url,
    )
    sql_out.parent.mkdir(parents=True, exist_ok=True)
    sql_out.write_text(combined, encoding="utf-8")
    stats.sql_path = str(sql_out)

    chunks_dir = sql_out.parent / f"{sql_out.stem}_mcp_chunks"
    chunks_dir.mkdir(parents=True, exist_ok=True)
    mcp_chunks = split_sql_for_mcp(combined)
    stats.sql_batches = len(mcp_chunks)
    for index, chunk in enumerate(mcp_chunks, 1):
        (chunks_dir / f"chunk_{index:02d}.sql").write_text(chunk, encoding="utf-8")
    return stats


def load_blueprint(
    parsed: ParsedBlueprint,
    *,
    cluster_slug: str | None = None,
    source_url: str | None = None,
    sql_out: Path | None = None,
    dry_run: bool = False,
    **_: object,
) -> LoadStats:
    """
    Generate SQL for Supabase MCP execution.

    This does not connect to Postgres locally. Apply the generated SQL with
    Supabase MCP execute_sql (or paste batches from the output file).
    """
    out_path = sql_out or Path("output") / f"{slugify_cluster_name(parsed.cluster_name)}_load.sql"
    stats = write_load_sql(
        parsed,
        out_path,
        cluster_slug=cluster_slug,
        source_url=source_url,
    )
    if dry_run:
        stats.sql_path = str(out_path)
    return stats
