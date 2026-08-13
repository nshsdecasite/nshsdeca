"""Route PI PDFs to the correct parser (DECA cluster vs Jump$tart PFL)."""

from __future__ import annotations

from pathlib import Path

from pi_parser import ParsedBlueprint, parse_pi_blueprint, summarize_blueprint


def parse_blueprint(
    pdf_path: Path,
    *,
    manual_event_codes: dict[str, str] | None = None,
) -> ParsedBlueprint:
    from pfl_parser import is_pfl_pdf, parse_pfl_blueprint

    if is_pfl_pdf(pdf_path):
        return parse_pfl_blueprint(pdf_path)
    return parse_pi_blueprint(pdf_path, manual_event_codes=manual_event_codes)


__all__ = ["parse_blueprint", "summarize_blueprint", "ParsedBlueprint"]
