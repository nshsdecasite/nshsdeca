"""Fix PDF ligature corruption from pypdf text extraction.

DECA exam PDFs use embedded fonts where the 'ti' ligature is often extracted as:
  - '5' when between letters (e.g. communica5on -> communication)
  - '(' when between letters (e.g. opera(ons -> operations)
  - 'U' when between lowercase letters (e.g. wriUen -> written)
  - '55' when between letters (e.g. compe55on -> competition)
  - '5' at word start after whitespace (e.g. "the 5me" -> "the time")
"""

from __future__ import annotations

import re

_TI_AS_55 = re.compile(r"([a-z])55([a-z])")
_TI_AS_5 = re.compile(r"([a-zA-Z])5([a-z])")
_TI_AS_PAREN = re.compile(r"([a-zA-Z])\(([a-z])")
_TT_AS_U = re.compile(r"([a-z])U([a-z])")
_T_AS_5_WORD = re.compile(r"(\s)5mely\b")
_T_AS_5_ME = re.compile(r"(\s)5me\b")


def fix_pdf_ligatures(text: str | None) -> str | None:
    if not text:
        return text

    result = text
    while True:
        updated = _TI_AS_55.sub(r"\1titi\2", result)
        updated = _TI_AS_5.sub(r"\1ti\2", updated)
        updated = _TI_AS_PAREN.sub(r"\1ti\2", updated)
        updated = _TT_AS_U.sub(r"\1tt\2", updated)
        updated = _T_AS_5_WORD.sub(r"\1timely", updated)
        updated = _T_AS_5_ME.sub(r"\1time", updated)
        if updated == result:
            break
        result = updated
    return result
