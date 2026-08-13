"""Parse DECA cluster Performance Indicator PDF blueprints."""

from __future__ import annotations

import re
from dataclasses import dataclass, field
from pathlib import Path
from typing import Iterator

import pdfplumber

PAGE_MARKER_RE = re.compile(r"^--\s*(\d+)\s+of\s+(\d+)\s*--$", re.MULTILINE)
PAGE_HEADER_RE = re.compile(
    r"^(?P<section>.+?)\s+Page\s+(?P<page>\d+)\s*$", re.MULTILINE
)
INSTRUCTIONAL_AREA_RE = re.compile(
    r"^Instruc\(?onal Area:\s*(?P<name>.+?)\s*\((?P<code>[A-Z]{2,3})\)\s*$",
    re.MULTILINE,
)
STANDARD_RE = re.compile(r"^Standard:\s*(?P<text>.+)$", re.MULTILINE)
PERFORMANCE_ELEMENT_RE = re.compile(
    r"^Performance Element:\s*(?P<text>.+)$", re.MULTILINE
)
PERFORMANCE_INDICATORS_HEADER = "Performance Indicators:"
PI_CODE_RE = re.compile(r"\(([A-Z]{2,3}):(\d+)\)")
TIER_RE = re.compile(r"\((PQ|CS|SP|SU|MN|ON)\)\s*$")
PAGE_RANGE_RE = re.compile(r"pages\s+(\d+)(?:-(\d+))?", re.IGNORECASE)
EVENT_CODE_TAIL_RE = re.compile(r"\b([A-Z]{2,5})\s*$")
POSTED_DATE_RE = re.compile(
    r"Posted online\s+(\w+)\s+(\d{4})\s+by\s+DECA Inc\.", re.IGNORECASE
)
EXAM_YEAR_RE = re.compile(r"(\d{4})-(\d{4})\s+HS\s+DECA\s+Exams", re.IGNORECASE)
CLUSTER_NAME_RE = re.compile(
    r"^([A-Z][A-Za-z0-9 &+/-]+)\s+CAREER CLUSTER\s*$", re.MULTILINE
)
CLUSTER_NAME_MULTILINE_RE = re.compile(
    r"([A-Z][A-Z0-9 &+/-]+(?:\s*\n[A-Z][A-Za-z0-9 &+/-]+)?)\s+CAREER CLUSTER",
    re.MULTILINE,
)
CLUSTER_COVER_RE = re.compile(
    r"PERFORMANCE\s+INDICATORS\s*\n\s*(.+?)\s+CAREER CLUSTER",
    re.MULTILINE | re.DOTALL,
)
CHART_START = "The below chart indicates the performance indicators"
NOISE_LINE_PREFIXES = (
    "Copyright ©",
    "Finance Cluster for",
    "Entrepreneurship Cluster for",
    "Marketing Cluster for",
    "Hospitality and Tourism Cluster for",
    "Business Management and Administration Cluster for",
    "Personal Financial Literacy Cluster for",
)


@dataclass
class EventPageMapping:
    event_code: str
    event_name: str
    pathway_name: str | None
    page_numbers: set[int] = field(default_factory=set)
    exam_only: bool = False


@dataclass
class ParsedIndicator:
    pi_code: str
    indicator_text: str
    tier_code: str
    instructional_area_code: str
    instructional_area_name: str
    standard_text: str
    performance_element_text: str
    element_display_order: int
    blueprint_display_order: int
    pdf_page: int
    section_name: str


@dataclass
class ParsedBlueprint:
    cluster_name: str
    exam_year_start: int | None
    exam_year_end: int | None
    posted_date: str | None
    source_path: str
    total_pdf_pages: int
    event_codes_from_cover: dict[str, str]
    event_page_mappings: list[EventPageMapping]
    instructional_areas: dict[str, dict[str, str]]
    performance_elements: list[dict]
    indicators: list[ParsedIndicator]

    @property
    def blueprint_title(self) -> str:
        year_label = ""
        if self.exam_year_start and self.exam_year_end:
            year_label = f"{self.exam_year_start}-{self.exam_year_end} "
        return f"{year_label}HS {self.cluster_name} Performance Indicators"

    @property
    def blueprint_year(self) -> int | None:
        if self.exam_year_end:
            return self.exam_year_end
        if self.exam_year_start:
            return self.exam_year_start
        if self.posted_date:
            return int(self.posted_date.split("-", 1)[0]) + 1
        return None


def extract_pdf_pages(pdf_path: Path) -> list[tuple[int, str]]:
    """Return (printed_page_number, text) for each PDF page."""
    pages: list[tuple[int, str]] = []
    with pdfplumber.open(pdf_path) as pdf:
        for index, page in enumerate(pdf.pages):
            text = page.extract_text() or ""
            header = PAGE_HEADER_RE.search(text)
            printed_page = int(header.group("page")) if header else index + 1
            pages.append((printed_page, text))
    return pages


def extract_pdf_text(pdf_path: Path) -> tuple[str, int]:
    page_chunks = extract_pdf_pages(pdf_path)
    combined = "\n\n".join(text for _, text in page_chunks)
    return combined, len(page_chunks)


DEFAULT_EVENT_CODES = {
    "principles of finance": "PFN",
    "principles of entrepreneurship": "PEN",
    "principles of marketing": "PMK",
    "principles of hospitality and tourism": "PHT",
    "principles of business administration": "PBM",
    "principles of business management and administration": "PBM",
    "personal financial literacy": "PFL",
}

KNOWN_EVENT_NAME_CODES = {
    "accounting applications series": "ACT",
    "business finance series": "BFS",
    "financial consulting": "FCE",
    "financial services team decision making": "FTDM",
    "entrepreneurship series": "ENT",
    "entrepreneurship team decision making": "ETDM",
    "business law and ethics team decision making": "BLTDM",
    "human resources management series": "HRM",
    "principles of business administration": "PBM",
    "integrated marketing campaign-event": "IMCE",
    "integrated marketing campaign-product": "IMCP",
    "integrated marketing campaign-service": "IMCS",
    "principles of marketing": "PMK",
    "professional selling": "PSE",
    "apparel and accessories marketing series": "AAM",
    "automotive services marketing series": "ASM",
    "business services marketing series": "BSM",
    "buying and merchandising team decision making": "BTDM",
    "food marketing series": "FMS",
    "marketing communications series": "MCS",
    "marketing management team decision making": "MTDM",
    "retail merchandising series": "RMS",
    "sports and entertainment marketing series": "SEM",
    "sports and entertainment marketing team decision making": "STDM",
}

INVALID_COVER_EVENT_CODES = frozenset(
    {"ARE", "FOR", "THE", "AND", "INC", "ORG", "PDF", "USED", "HS", "CORE"}
)

STANDALONE_CLUSTER_RE = re.compile(
    r"PERFORMANCE\s+INDICATORS\s*\n\s*([A-Z][A-Z\s&/-]+?)\s*\n",
    re.MULTILINE,
)
COVER_EVENT_LIST_MARKERS = (
    "ARE USED FOR THE FOLLOWING EVENTS:",
    "ARE USED IN THE FOLLOWING EVENTS:",
)
PRINCIPLES_COVER_MARKER = "ARE USED IN THE FOLLOWING EVENTS:"


def normalize_event_name(name: str) -> str:
    cleaned = name.strip()
    cleaned = cleaned.replace("\u2013", "-").replace("\u2014", "-").replace("\u2012", "-")
    cleaned = re.sub(r"\s+Event\*?$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\s+Event$", "", cleaned, flags=re.IGNORECASE)
    cleaned = re.sub(r"\*$", "", cleaned)
    cleaned = re.sub(r"\s+", " ", cleaned)
    return cleaned.strip()


def parse_cover_event_list(text: str) -> list[str]:
    marker_index = -1
    marker_len = 0
    for marker in COVER_EVENT_LIST_MARKERS:
        index = text.find(marker)
        if index != -1:
            marker_index = index
            marker_len = len(marker)
            break
    if marker_index == -1:
        return []

    section = text[marker_index + marker_len :]
    section = section.split("Performance indicators are", 1)[0]
    events: list[str] = []
    for raw_line in section.splitlines():
        line = raw_line.strip()
        if not line:
            continue
        if line.startswith("This list was compiled"):
            break
        events.append(line)
    return events


def parse_cover_event_codes(text: str) -> dict[str, str]:
    """Map normalized event names to DECA event codes from the cover page."""
    mapping: dict[str, str] = {}
    cover_section = text.split("TABLE OF CONTENTS", 1)[0]
    for raw_line in cover_section.splitlines():
        line = raw_line.strip()
        if not line or line.startswith("Performance indicators are"):
            continue
        match = EVENT_CODE_TAIL_RE.search(line)
        if not match:
            continue
        code = match.group(1)
        if code in INVALID_COVER_EVENT_CODES:
            continue
        name_part = line[: match.start()].strip()
        if len(name_part) < 8:
            continue
        upper_name = name_part.upper()
        if "PERFORMANCE INDICATORS" in upper_name or "CAREER CLUSTER" in upper_name:
            continue
        mapping[normalize_event_name(name_part)] = code

    for event_line in parse_cover_event_list(text):
        normalized = normalize_event_name(event_line)
        lowered = normalized.lower()
        if lowered in KNOWN_EVENT_NAME_CODES:
            mapping[normalized] = KNOWN_EVENT_NAME_CODES[lowered]
            continue
        for key, code in KNOWN_EVENT_NAME_CODES.items():
            if key in lowered or lowered in key:
                mapping[normalized] = code
                break

    return mapping


def expand_page_ranges(page_range_texts: list[str]) -> set[int]:
    pages: set[int] = set()
    for chunk in page_range_texts:
        for start_s, end_s in PAGE_RANGE_RE.findall(chunk):
            start = int(start_s)
            end = int(end_s) if end_s else start
            pages.update(range(start, end + 1))
    return pages


def resolve_event_code(
    event_line: str,
    cover_codes: dict[str, str],
    manual_overrides: dict[str, str] | None = None,
) -> tuple[str, str, bool]:
    overrides = manual_overrides or {}
    exam_only = "*" in event_line
    cleaned = event_line.replace("*", "").strip()
    cleaned = re.sub(r"\s+Event$", "", cleaned, flags=re.IGNORECASE).strip()
    normalized = normalize_event_name(cleaned)

    lowered = normalized.lower()
    if lowered in DEFAULT_EVENT_CODES:
        return DEFAULT_EVENT_CODES[lowered], normalized, exam_only

    if lowered in KNOWN_EVENT_NAME_CODES:
        return KNOWN_EVENT_NAME_CODES[lowered], normalized, exam_only

    for key, code in KNOWN_EVENT_NAME_CODES.items():
        if key in lowered or lowered in key:
            return code, normalized, exam_only

    for key, code in overrides.items():
        if key.lower() in normalized.lower():
            return code, normalized, exam_only

    if normalized in cover_codes:
        return cover_codes[normalized], normalized, exam_only

    for cover_name, code in cover_codes.items():
        cover_normalized = normalize_event_name(cover_name).lower()
        if cover_normalized == normalized.lower():
            return code, normalized, exam_only
        if cover_normalized in normalized.lower() or normalized.lower() in cover_normalized:
            return code, normalized, exam_only

    raise ValueError(f"Could not resolve event code for chart row: {event_line!r}")


def parse_event_page_chart(
    text: str,
    cover_codes: dict[str, str],
    manual_event_codes: dict[str, str] | None = None,
) -> list[EventPageMapping]:
    chart_start = text.find(CHART_START)
    if chart_start == -1:
        raise ValueError("Could not find event/page chart (page 3) in PDF.")

    chart_text = text[chart_start:]
    chart_text = chart_text.split("Key", 1)[0]
    lines = [line.strip() for line in chart_text.splitlines() if line.strip()]

    mappings: list[EventPageMapping] = []
    pending: EventPageMapping | None = None

    for line in lines:
        lowered = line.lower()
        if lowered.startswith("tier ") or lowered.startswith("exam") or lowered.startswith("role-play"):
            continue
        if lowered in {"business administration core", "pathway"}:
            continue
        if lowered.startswith("administration career") or lowered.startswith("core cluster"):
            continue
        if "pages" not in line.lower():
            if pending and not pending.pathway_name and not line.startswith("*"):
                pending.pathway_name = line
            continue

        page_chunks = PAGE_RANGE_RE.findall(line)
        if not page_chunks:
            continue

        event_part = PAGE_RANGE_RE.split(line, maxsplit=1)[0].strip()
        event_part = event_part.replace("*", "").strip()
        event_part = re.sub(r"\s+Event$", "", event_part, flags=re.IGNORECASE).strip()
        code, event_name, exam_only = resolve_event_code(
            event_part, cover_codes, manual_event_codes
        )
        page_numbers = expand_page_ranges([line])

        mapping = EventPageMapping(
            event_code=code,
            event_name=event_name,
            pathway_name=None,
            page_numbers=page_numbers,
            exam_only=exam_only or "*" in line,
        )
        mappings.append(mapping)
        pending = mapping

    if not mappings:
        raise ValueError("Event/page chart parsed zero rows.")

    return mappings


def build_fallback_event_mappings(
    pdf_path: Path,
    cover_codes: dict[str, str],
    manual_event_codes: dict[str, str] | None = None,
) -> list[EventPageMapping]:
    """When a PDF has no page chart, map all PI pages to each cover event."""
    resolved: dict[str, str] = {}
    for event_name, code in cover_codes.items():
        resolved[code] = event_name

    for event_line in parse_cover_event_list(extract_pdf_text(pdf_path)[0]):
        code, event_name, _ = resolve_event_code(
            event_line, cover_codes, manual_event_codes
        )
        resolved[code] = event_name

    if not resolved:
        raise ValueError("Could not resolve any events from PDF cover page.")

    pi_pages: set[int] = set()
    for printed_page, _, page_text in iter_content_pages_from_pdf(pdf_path):
        if PERFORMANCE_INDICATORS_HEADER in page_text or PI_CODE_RE.search(page_text):
            pi_pages.add(printed_page)

    if not pi_pages:
        pi_pages = {
            printed_page
            for printed_page, _, _ in iter_content_pages_from_pdf(pdf_path)
            if printed_page >= 2
        }

    return [
        EventPageMapping(
            event_code=code,
            event_name=event_name,
            pathway_name=None,
            page_numbers=set(pi_pages),
        )
        for code, event_name in sorted(resolved.items())
    ]


def is_principles_pdf(text: str) -> bool:
    return PRINCIPLES_COVER_MARKER in text


def parse_cluster_name(text: str) -> str:
    if is_principles_pdf(text):
        return "Principles"

    cluster_match = CLUSTER_COVER_RE.search(text)
    if not cluster_match:
        cluster_match = CLUSTER_NAME_MULTILINE_RE.search(text)
    if not cluster_match:
        cluster_match = CLUSTER_NAME_RE.search(text)
    if cluster_match:
        cluster_name = re.sub(r"\s+", " ", cluster_match.group(1).strip())
        cluster_name = cluster_name.replace("+", " and ")
        cluster_name = re.sub(r"\s+", " ", cluster_name).strip().title()
    else:
        standalone = STANDALONE_CLUSTER_RE.search(text)
        if not standalone:
            raise ValueError("Could not find cluster name in PDF.")
        cluster_name = re.sub(r"\s+", " ", standalone.group(1).strip()).title()

    if cluster_name.lower() == "personal financial literacy":
        return "Personal Financial Literacy"
    if "business management" in cluster_name.lower() and "administration" in cluster_name.lower():
        return "Business Management and Administration"
    if "hospitality" in cluster_name.lower() and "tourism" in cluster_name.lower():
        return "Hospitality and Tourism"
    if cluster_name.lower().endswith(" and administration"):
        return cluster_name.replace(" And Administration", " and Administration")
    return cluster_name


def page_to_events(mappings: list[EventPageMapping]) -> dict[int, set[str]]:
    lookup: dict[int, set[str]] = {}
    for mapping in mappings:
        for page in mapping.page_numbers:
            lookup.setdefault(page, set()).add(mapping.event_code)
    return lookup


def parse_metadata(
    text: str,
    pdf_path: Path,
    total_pages: int,
    manual_event_codes: dict[str, str] | None = None,
) -> dict:
    cluster_name = parse_cluster_name(text)

    year_match = EXAM_YEAR_RE.search(text)
    exam_year_start = int(year_match.group(1)) if year_match else None
    exam_year_end = int(year_match.group(2)) if year_match else None

    posted_match = POSTED_DATE_RE.search(text)
    posted_date = None
    if posted_match:
        month_name, year_s = posted_match.groups()
        month_map = {
            "january": "01",
            "february": "02",
            "march": "03",
            "april": "04",
            "may": "05",
            "june": "06",
            "july": "07",
            "august": "08",
            "september": "09",
            "october": "10",
            "november": "11",
            "december": "12",
        }
        month = month_map.get(month_name.lower())
        if month:
            posted_date = f"{year_s}-{month}-01"

    cover_codes = parse_cover_event_codes(text)
    chart_start = text.find(CHART_START)
    if chart_start == -1:
        event_mappings = build_fallback_event_mappings(
            pdf_path, cover_codes, manual_event_codes
        )
    else:
        event_mappings = parse_event_page_chart(text, cover_codes, manual_event_codes)

    return {
        "cluster_name": cluster_name,
        "exam_year_start": exam_year_start,
        "exam_year_end": exam_year_end,
        "posted_date": posted_date,
        "source_path": str(pdf_path),
        "total_pdf_pages": total_pages,
        "event_codes_from_cover": cover_codes,
        "event_page_mappings": event_mappings,
    }


def iter_content_pages_from_pdf(pdf_path: Path) -> Iterator[tuple[int, str, str]]:
    """Yield (printed_page_number, section_name, page_text)."""
    for printed_page, text in extract_pdf_pages(pdf_path):
        chunk = text.strip()
        if not chunk:
            continue
        header = PAGE_HEADER_RE.search(chunk)
        section_name = header.group("section").strip() if header else "Unknown Section"
        yield printed_page, section_name, chunk


def iter_content_pages(text: str, pdf_path: Path | None = None) -> Iterator[tuple[int, str, str]]:
    """Yield content pages from a PDF path or legacy marker-delimited text."""
    if pdf_path is not None:
        yield from iter_content_pages_from_pdf(pdf_path)
        return

    matches = list(PAGE_MARKER_RE.finditer(text))
    for idx, match in enumerate(matches):
        pdf_page = int(match.group(1))
        start = match.end()
        end = matches[idx + 1].start() if idx + 1 < len(matches) else len(text)
        chunk = text[start:end].strip()
        header = PAGE_HEADER_RE.search(chunk)
        section_name = header.group("section").strip() if header else "Unknown Section"
        yield pdf_page, section_name, chunk


def is_noise_line(line: str) -> bool:
    stripped = line.strip()
    if not stripped:
        return True
    return stripped.startswith(NOISE_LINE_PREFIXES)


def parse_indicator_lines(lines: list[str]) -> list[tuple[str, str, str]]:
    """Parse PI lines into (pi_code, indicator_text, tier_code)."""
    results: list[tuple[str, str, str]] = []
    buffer: list[str] = []

    for raw_line in lines:
        stripped = raw_line.strip()
        if not stripped:
            continue

        buffer.append(stripped)
        joined = " ".join(buffer)
        if not PI_CODE_RE.search(joined):
            continue

        has_tier = bool(TIER_RE.search(joined))
        if not has_tier and len(buffer) > 1:
            has_tier = bool(re.fullmatch(r"\((PQ|CS|SP|SU|MN|ON)\)", buffer[-1]))

        if not has_tier:
            continue

        parsed = parse_indicator_block(joined)
        if parsed:
            results.append(parsed)
        buffer = []

    return results


def split_indicator_blocks(body: str) -> list[str]:
    lines = body.splitlines()
    blocks: list[list[str]] = []
    current: list[str] = []

    for line in lines:
        stripped = line.strip()
        if not stripped:
            continue
        if stripped.startswith(
            (
                "Performance Element:",
                "Instructional Area:",
                "Standard:",
            )
        ):
            if current:
                blocks.append(current)
                current = []
            continue
        if stripped == PERFORMANCE_INDICATORS_HEADER:
            if current:
                blocks.append(current)
                current = []
            continue
        if is_noise_line(stripped):
            continue
        current.append(stripped)

    if current:
        blocks.append(current)
    return [" ".join(block).strip() for block in blocks if block]


def parse_indicator_block(block: str) -> tuple[str, str, str] | None:
    code_match = None
    for match in PI_CODE_RE.finditer(block):
        code_match = match

    if not code_match:
        return None

    area_code, number = code_match.groups()
    pi_code = f"{area_code}:{number}"

    before_code = block[: code_match.start()].strip()
    after_code = block[code_match.end() :].strip()

    tier_match = TIER_RE.search(after_code)
    tier_code = tier_match.group(1) if tier_match else None
    if not tier_code:
        trailing = after_code.strip()
        if trailing in {"PQ", "CS", "SP", "SU", "MN", "ON"}:
            tier_code = trailing
        else:
            only_tier = re.fullmatch(r"\((PQ|CS|SP|SU|MN|ON)\)", trailing)
            if only_tier:
                tier_code = only_tier.group(1)

    if not tier_code:
        return None

    indicator_text = re.sub(r"\s+", " ", before_code).strip(" ,;")
    if not indicator_text:
        return None

    return pi_code, indicator_text, tier_code


def parse_performance_content(
    pdf_path: Path,
    page_event_lookup: dict[int, set[str]],
) -> tuple[dict[str, dict[str, str]], list[dict], list[ParsedIndicator]]:
    instructional_areas: dict[str, dict[str, str]] = {}
    performance_elements: list[dict] = []
    indicators: list[ParsedIndicator] = []

    blueprint_order = 0
    current_ia_code = ""
    current_ia_name = ""
    current_standard = ""
    current_standard_lines: list[str] = []
    current_element = ""
    element_order = 0
    in_indicators = False
    indicator_lines: list[str] = []

    def flush_indicators(page_num: int, section: str) -> None:
        nonlocal blueprint_order, in_indicators, indicator_lines
        nonlocal current_ia_name, current_ia_code, current_standard, current_element, element_order
        nonlocal current_standard_lines
        if not indicator_lines:
            in_indicators = False
            return

        for pi_code, indicator_text, tier_code in parse_indicator_lines(indicator_lines):
            area_code = pi_code.split(":", 1)[0]
            ia_name = current_ia_name
            standard_text = current_standard
            if area_code != current_ia_code and area_code in instructional_areas:
                ia_name = instructional_areas[area_code]["name"]
                standard_text = instructional_areas[area_code].get("standard_text", "")

            blueprint_order += 1
            indicators.append(
                ParsedIndicator(
                    pi_code=pi_code,
                    indicator_text=indicator_text,
                    tier_code=tier_code,
                    instructional_area_code=area_code,
                    instructional_area_name=ia_name,
                    standard_text=standard_text,
                    performance_element_text=current_element,
                    element_display_order=element_order,
                    blueprint_display_order=blueprint_order,
                    pdf_page=page_num,
                    section_name=section,
                )
            )

        indicator_lines = []
        in_indicators = False

    for pdf_page, section_name, page_text in iter_content_pages("", pdf_path=pdf_path):
        if pdf_page < min(page_event_lookup.keys(), default=4):
            continue

        for raw_line in page_text.splitlines():
            line = raw_line.strip()
            if is_noise_line(line):
                continue
            if PAGE_HEADER_RE.match(line):
                continue
            if line.startswith("Page ") and line[5:].strip().isdigit():
                continue

            ia_match = INSTRUCTIONAL_AREA_RE.match(line)
            if ia_match:
                flush_indicators(pdf_page, section_name)
                current_ia_code = ia_match.group("code")
                current_ia_name = ia_match.group("name").strip()
                instructional_areas[current_ia_code] = {
                    "code": current_ia_code,
                    "name": current_ia_name,
                    "standard_text": "",
                }
                current_standard = ""
                current_standard_lines = []
                current_element = ""
                element_order = 0
                continue

            std_match = STANDARD_RE.match(line)
            if std_match and current_ia_code:
                current_standard_lines = [std_match.group("text").strip()]
                current_standard = current_standard_lines[0]
                instructional_areas[current_ia_code]["standard_text"] = current_standard
                continue

            if (
                current_ia_code
                and current_standard_lines
                and not in_indicators
                and not PERFORMANCE_ELEMENT_RE.match(line)
                and not line.startswith("Instructional Area:")
                and PI_CODE_RE.search(line) is None
            ):
                current_standard_lines.append(line)
                current_standard = " ".join(current_standard_lines).strip()
                instructional_areas[current_ia_code]["standard_text"] = current_standard
                continue

            el_match = PERFORMANCE_ELEMENT_RE.match(line)
            if el_match:
                flush_indicators(pdf_page, section_name)
                current_standard_lines = []
                current_element = re.sub(r"\s+", " ", el_match.group("text")).strip()
                element_order += 1
                performance_elements.append(
                    {
                        "instructional_area_code": current_ia_code,
                        "element_text": current_element,
                        "display_order": element_order,
                    }
                )
                continue

            if line == PERFORMANCE_INDICATORS_HEADER:
                flush_indicators(pdf_page, section_name)
                in_indicators = True
                continue

            if in_indicators:
                indicator_lines.append(line)

        flush_indicators(pdf_page, section_name)

    return instructional_areas, performance_elements, indicators


def attach_event_codes_to_indicators(
    indicators: list[ParsedIndicator],
    page_event_lookup: dict[int, set[str]],
) -> list[ParsedIndicator]:
    return indicators


def parse_pi_blueprint(
    pdf_path: Path,
    manual_event_codes: dict[str, str] | None = None,
) -> ParsedBlueprint:
    text, total_pages = extract_pdf_text(pdf_path)
    metadata = parse_metadata(text, pdf_path, total_pages, manual_event_codes)
    page_event_lookup = page_to_events(metadata["event_page_mappings"])
    instructional_areas, performance_elements, indicators = parse_performance_content(
        pdf_path, page_event_lookup
    )

    if not indicators:
        raise ValueError(f"No performance indicators parsed from {pdf_path}")

    return ParsedBlueprint(
        cluster_name=metadata["cluster_name"],
        exam_year_start=metadata["exam_year_start"],
        exam_year_end=metadata["exam_year_end"],
        posted_date=metadata["posted_date"],
        source_path=metadata["source_path"],
        total_pdf_pages=metadata["total_pdf_pages"],
        event_codes_from_cover=metadata["event_codes_from_cover"],
        event_page_mappings=metadata["event_page_mappings"],
        instructional_areas=instructional_areas,
        performance_elements=performance_elements,
        indicators=indicators,
    )


def indicator_events(
    indicator: ParsedIndicator,
    page_event_lookup: dict[int, set[str]],
) -> set[str]:
    return page_event_lookup.get(indicator.pdf_page, set())


def summarize_blueprint(parsed: ParsedBlueprint) -> dict:
    page_event_lookup = page_to_events(parsed.event_page_mappings)
    indicators_without_events = [
        ind.pi_code
        for ind in parsed.indicators
        if not indicator_events(ind, page_event_lookup)
    ]
    return {
        "cluster_name": parsed.cluster_name,
        "blueprint_title": parsed.blueprint_title,
        "blueprint_year": parsed.blueprint_year,
        "posted_date": parsed.posted_date,
        "instructional_area_count": len(parsed.instructional_areas),
        "performance_element_count": len(parsed.performance_elements),
        "indicator_count": len(parsed.indicators),
        "event_mappings": [
            {
                "event_code": m.event_code,
                "event_name": m.event_name,
                "pathway_name": m.pathway_name,
                "exam_only": m.exam_only,
                "page_count": len(m.page_numbers),
                "page_ranges": _compress_page_ranges(sorted(m.page_numbers)),
            }
            for m in parsed.event_page_mappings
        ],
        "indicators_without_event_mapping": len(indicators_without_events),
        "sample_indicators_without_events": indicators_without_events[:10],
    }


def _compress_page_ranges(pages: list[int]) -> list[str]:
    if not pages:
        return []
    ranges: list[str] = []
    start = prev = pages[0]
    for page in pages[1:]:
        if page == prev + 1:
            prev = page
            continue
        ranges.append(f"{start}-{prev}" if start != prev else str(start))
        start = prev = page
    ranges.append(f"{start}-{prev}" if start != prev else str(start))
    return ranges
