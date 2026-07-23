#!/usr/bin/env python3
"""Download DECA exam PDFs from deca.org/resources."""

from __future__ import annotations

import json
import re
import subprocess
import time
from pathlib import Path
from urllib.parse import quote, unquote, urlsplit, urlunsplit

OUT_DIR = Path(__file__).resolve().parents[1] / "data" / "exams"
MANIFEST_PATH = OUT_DIR / "manifest.json"
BASE_URL = "https://www.deca.org/resources"
PAGINATION_PARAM = "5d5b7fa4_page"
LISTING_RE = re.compile(
    r'<a href="([^"]+)"[^>]*class="ad-listing-item shadow-medium w-inline-block">(.*?)</a>',
    re.S,
)
PDF_RE = re.compile(r"https://cdn\.prod\.website-files\.com/[^\"]+\.pdf")

EXAM_SLUGS = {
    "Business Administration Core Exam": "bac",
    "Business Management and Administration Exam": "bma",
    "Entrepreneurship Exam": "entrepreneurship",
    "Finance Exam": "finance",
    "Hospitality and Tourism Exam": "hospitality",
    "Marketing Exam": "marketing",
    "Personal Financial Literacy Exam": "pfl",
}


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


def exam_slug(name: str) -> str:
    return EXAM_SLUGS.get(name, re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-") or "unknown")


def collect_exams() -> dict[str, dict]:
    items: dict[str, dict] = {}
    page = 1

    while True:
        url = BASE_URL if page == 1 else f"{BASE_URL}?{PAGINATION_PARAM}={page}"
        html = fetch(url)
        new_count = 0

        for href, body in LISTING_RE.findall(html):
            if field(body, "Type") != "Exam":
                continue

            pdf_url = resolve_pdf_url(unquote(href))
            if not pdf_url or pdf_url in items:
                continue

            name = field(body, "Name")
            filename = unquote(pdf_url.split("/")[-1])
            items[pdf_url] = {
                "url": pdf_url,
                "filename": filename,
                "name": name,
                "slug": exam_slug(name),
                "event": field(body, "CompetitiveEvent"),
                "event_code": field(body, "Keywords") or exam_slug(name),
                "year": field(body, "Year") or "unknown",
                "cluster": field(body, "Cluster"),
            }
            new_count += 1

        print(f"page {page:2d}: +{new_count:3d} new ({len(items)} total)")
        if not LISTING_RE.findall(html):
            break
        page += 1
        time.sleep(0.25)

    return items


def destination_for(item: dict) -> Path:
    return OUT_DIR / item["slug"] / f"{item['year']}.pdf"


def safe_url(url: str) -> str:
    parts = urlsplit(url)
    return urlunsplit((parts.scheme, parts.netloc, quote(unquote(parts.path), safe="/"), parts.query, parts.fragment))


def download(url: str, dest: Path) -> None:
    dest.parent.mkdir(parents=True, exist_ok=True)
    if dest.exists() and dest.stat().st_size > 1000:
        return
    subprocess.run(["curl", "-sL", safe_url(url), "-o", str(dest)], check=True)


def main() -> None:
    items = collect_exams()
    manifest = []

    for index, item in enumerate(
        sorted(items.values(), key=lambda row: (row["slug"], row["year"])),
        1,
    ):
        dest = destination_for(item)
        print(f"[{index}/{len(items)}] {dest.relative_to(OUT_DIR.parent.parent)}")
        download(item["url"], dest)
        manifest.append({**item, "path": str(dest.relative_to(OUT_DIR.parent.parent))})

    MANIFEST_PATH.parent.mkdir(parents=True, exist_ok=True)
    MANIFEST_PATH.write_text(json.dumps(manifest, indent=2))
    print(f"\nDownloaded {len(manifest)} exam PDFs to {OUT_DIR}")


if __name__ == "__main__":
    main()
