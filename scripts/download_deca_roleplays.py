#!/usr/bin/env python3
"""Download DECA roleplay PDFs from deca.org/resources."""

from __future__ import annotations

import json
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit, urlunsplit

OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "roleplays"
MANIFEST_PATH = OUT_DIR / "manifest.json"
BASE_URL = "https://www.deca.org/resources"
PAGINATION_PARAM = "5d5b7fa4_page"
LISTING_RE = re.compile(
    r'<a href="([^"]+)"[^>]*class="ad-listing-item shadow-medium w-inline-block">(.*?)</a>',
    re.S,
)
PDF_RE = re.compile(r"https://cdn\.prod\.website-files\.com/[^\"]+\.pdf")
FILENAME_RE = re.compile(
    r"DECA_([A-Z0-9]+)_20(\d{2})_District_Event(?:_(\d+))?(?:_Virtual)?",
    re.I,
)


def fetch(url: str) -> str:
    return subprocess.check_output(["curl", "-sL", url], text=True)


def field(body: str, name: str) -> str:
    match = re.search(rf'fs-cmsfilter-field="{name}"[^>]*>([^<]*)<', body)
    return match.group(1).strip() if match else ""


def resolve_pdf_url(href: str) -> str | None:
    if href.endswith(".pdf"):
        return href
    if href.startswith("/"):
        href = f"https://www.deca.org{href}"
    html = fetch(href)
    match = PDF_RE.search(html)
    return match.group(0) if match else None


def collect_roleplays() -> dict[str, dict]:
    items: dict[str, dict] = {}
    page = 1

    while True:
        url = BASE_URL if page == 1 else f"{BASE_URL}?{PAGINATION_PARAM}={page}"
        html = fetch(url)
        new_count = 0

        for href, body in LISTING_RE.findall(html):
            if field(body, "Type") != "Role-Play":
                continue

            pdf_url = resolve_pdf_url(unquote(href))
            if not pdf_url or pdf_url in items:
                continue

            filename = unquote(pdf_url.split("/")[-1])
            code_match = FILENAME_RE.search(filename)
            event_code = code_match.group(1).upper() if code_match else field(body, "Keywords") or "unknown"
            year = (
                f"20{code_match.group(2)}"
                if code_match
                else field(body, "Year") or "unknown"
            )

            items[pdf_url] = {
                "url": pdf_url,
                "filename": filename,
                "name": field(body, "Name"),
                "event": field(body, "CompetitiveEvent"),
                "event_code": event_code,
                "year": year,
                "cluster": field(body, "Cluster"),
                "instructional_area": field(body, "InstructionalArea"),
            }
            new_count += 1

        print(f"page {page:2d}: +{new_count:3d} new ({len(items)} total)")
        if new_count == 0 and page > 1:
            break
        page += 1
        time.sleep(0.25)

    return items


def destination_for(item: dict) -> Path:
    filename = item["filename"]
    match = FILENAME_RE.search(filename)
    if match:
        event_code = match.group(1).upper()
        year = f"20{match.group(2)}"
        suffix = match.group(3)
        virtual = "_Virtual" if "_Virtual" in filename else ""
        stem = f"district-event-{suffix}{virtual}" if suffix else f"district-event{virtual}"
        return OUT_DIR / year / event_code / f"{stem}.pdf"

    return OUT_DIR / item["year"] / item["event_code"] / filename


def safe_url(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, quote(unquote(parts.path), safe="/"), parts.query, parts.fragment))


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 1000:
        return
    subprocess.run(["curl", "-sL", safe_url(url), "-o", str(dest)], check=True)


def main() -> None:
    items = collect_roleplays()
    manifest = []

    for index, item in enumerate(sorted(items.values(), key=lambda row: (row["year"], row["event_code"], row["filename"])), 1):
        dest = destination_for(item)
        print(f"[{index}/{len(items)}] {dest.relative_to(OUT_DIR.parent.parent)}")
        download(item["url"], dest)
        manifest.append({**item, "path": str(dest.relative_to(OUT_DIR.parent.parent))})

    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))
    print(f"\nDownloaded {len(manifest)} roleplay PDFs to {OUT_DIR}")


if __name__ == "__main__":
    main()
