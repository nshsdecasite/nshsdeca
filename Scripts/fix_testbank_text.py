#!/usr/bin/env python3
"""Repair PDF line-wrap corruption in testbank question and choice text."""

from __future__ import annotations

import argparse
import os
import re
from functools import lru_cache
from pathlib import Path

import psycopg2
from spellchecker import SpellChecker

ROOT = Path(__file__).resolve().parents[1]

STOP_WORDS = {
    "a",
    "an",
    "the",
    "is",
    "to",
    "of",
    "in",
    "on",
    "at",
    "by",
    "or",
    "as",
    "be",
    "we",
    "he",
    "she",
    "it",
    "if",
    "so",
    "no",
    "do",
    "up",
    "my",
    "me",
    "us",
    "am",
    "for",
    "and",
    "but",
    "not",
    "you",
    "all",
    "can",
    "her",
    "was",
    "one",
    "our",
    "out",
    "day",
    "get",
    "has",
    "him",
    "his",
    "how",
    "its",
    "may",
    "new",
    "now",
    "old",
    "see",
    "way",
    "who",
    "did",
    "let",
    "put",
    "say",
    "too",
    "use",
    "are",
    "had",
    "any",
    "per",
    "via",
}

SUFFIXES = (
    "y",
    "ay",
    "ey",
    "ly",
    "s",
    "e",
    "n",
    "t",
    "r",
    "l",
    "d",
    "es",
    "ed",
    "al",
    "ion",
    "ment",
    "ness",
    "ity",
    "ous",
    "ing",
    "ship",
    "tion",
    "ence",
    "ance",
    "ical",
    "ally",
)

BLEED_PATTERN = re.compile(r"\s+\d+\s+\d+\.\s+[A-Z].*$")
SPLIT_PATTERN = re.compile(r"\b([a-zA-Z]{2,})(?:'s)? ([a-z]{1,6})\b")
CAP_SPLIT_PATTERN = re.compile(r"\b([A-Z]) ([a-z]{2,})\b")
SINGLE_CAP_SPLIT_PATTERN = re.compile(r"\b([A-Z]) ([a-z])\b")
TI_FIVE_PATTERN = re.compile(r"(?<=[a-zA-Z])5(?=[a-zA-Z])")


def load_env() -> None:
    env_path = ROOT / ".env"
    if not env_path.exists():
        return
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        os.environ.setdefault(key.strip(), value.strip())


def clean_token(token: str) -> str:
    return token.lower().strip(".,;:!?\"'()[]")


def make_spell_checker() -> SpellChecker:
    spell = SpellChecker(distance=2)
    spell.word_frequency.load_words(
        [
            "nonverbally",
            "deca",
            "lap",
            "deca's",
            "ecommerce",
            "telecommuting",
            "videoconference",
            "reimbursement",
            "stakeholders",
            "entrepreneurship",
        ]
    )
    return spell


@lru_cache(maxsize=50000)
def cached_unknown_count(spell_id: int, token: str) -> int:
    # spell object isn't hashable; key by id(spell)
    spell = _SPELL_CHECKER
    assert spell is not None
    cleaned = clean_token(token)
    if not cleaned:
        return 0
    if cleaned.isdigit() or re.fullmatch(r"[\d,$%.-]+", cleaned):
        return 0
    if cleaned.startswith("http") or "@" in cleaned:
        return 0
    return len(spell.unknown([cleaned]))


_SPELL_CHECKER: SpellChecker | None = None


def is_valid_word(spell: SpellChecker, token: str) -> bool:
    return cached_unknown_count(id(spell), token) == 0


def should_join(spell: SpellChecker, left: str, right: str) -> bool:
    right_clean = clean_token(right)
    left_clean = clean_token(left)
    if right_clean in STOP_WORDS:
        return False
    if left_clean in {"i", "a"}:
        return False
    combined = left + right
    if not is_valid_word(spell, combined):
        return False
    if is_valid_word(spell, right_clean) and is_valid_word(spell, left_clean):
        return False
    return True


def fix_truncated_token(spell: SpellChecker, token: str) -> str:
    if not token or token.startswith("http") or "$" in token:
        return token

    punct = ""
    core = token
    while core and core[-1] in ".,;:!?\"'":
        punct = core[-1] + punct
        core = core[:-1]

    if not core or is_valid_word(spell, core):
        return core + punct

    if core.endswith("l"):
        if is_valid_word(spell, core + "y"):
            return core + "y" + punct
        if len(core) > 3 and is_valid_word(spell, core[:-1] + "ly"):
            return core[:-1] + "ly" + punct

    suffixes = list(SUFFIXES)
    if len(core) <= 3:
        suffixes = ["y", "ay", "ey", "ly", "ty", *suffixes]

    for suffix in suffixes:
        candidate = core + suffix
        if is_valid_word(spell, candidate):
            return candidate + punct

    for letter in "abcdefghijklmnopqrstuvwxyz":
        candidate = core + letter
        if is_valid_word(spell, candidate):
            return candidate + punct

    corrected = spell.correction(core.lower())
    if corrected and corrected != core.lower() and is_valid_word(spell, corrected):
        if core[0].isupper():
            corrected = corrected[0].upper() + corrected[1:]
        return corrected + punct

    return token


def fix_split_words(spell: SpellChecker, text: str) -> str:
    previous = None
    while previous != text:
        previous = text
        text = CAP_SPLIT_PATTERN.sub(
            lambda match: match.group(1) + match.group(2)
            if should_join(spell, match.group(1), match.group(2))
            else match.group(0),
            text,
        )
        text = SINGLE_CAP_SPLIT_PATTERN.sub(
            lambda match: match.group(1) + match.group(2)
            if match.group(1) not in {"I", "A"}
            and match.group(2) not in STOP_WORDS
            and is_valid_word(spell, match.group(1) + match.group(2))
            else match.group(0),
            text,
        )

        words = text.split(" ")
        merged: list[str] = []
        index = 0
        while index < len(words):
            current = words[index]
            if index + 1 < len(words):
                next_word = words[index + 1]
                trailing = ""
                right_core = next_word
                while right_core and right_core[-1] in ".,;:!?\"'":
                    trailing = right_core[-1] + trailing
                    right_core = right_core[:-1]

                if should_join(spell, current, right_core):
                    merged.append(current + right_core + trailing)
                    index += 2
                    continue

            merged.append(current)
            index += 1

        text = " ".join(merged)

    return text


def fix_corrupted_text(spell: SpellChecker, text: str | None) -> str | None:
    if text is None:
        return None

    text = BLEED_PATTERN.sub("", text)
    text = TI_FIVE_PATTERN.sub("ti", text)
    text = re.sub(r"-\s+", "-", text)
    text = re.sub(r"\s{2,}", " ", text).strip()
    text = fix_split_words(spell, text)

    tokens = re.findall(r"\S+|\s+", text)
    if not tokens:
        return text

    word_indexes = [index for index, token in enumerate(tokens) if not token.isspace()]
    last_word_index = word_indexes[-1] if word_indexes else -1
    single_word = len(word_indexes) == 1

    fixed_tokens: list[str] = []
    for index, token in enumerate(tokens):
        if token.isspace():
            fixed_tokens.append(token)
            continue
        if "/" in token:
            fixed_tokens.append(
                "/".join(fix_truncated_token(spell, segment) for segment in token.split("/"))
            )
            continue
        if single_word or index == last_word_index:
            fixed_tokens.append(fix_truncated_token(spell, token))
        else:
            fixed_tokens.append(token)

    return "".join(fixed_tokens)


def connect():
    project_ref = os.environ.get("SUPABASE_PROJECT_REF", "tfrwksqmuxrtqfehzuti")
    return psycopg2.connect(
        host="aws-0-us-west-2.pooler.supabase.com",
        port=5432,
        dbname="postgres",
        user=f"postgres.{project_ref}",
        password=os.environ["SUPABASE_DB_PASSWORD"],
        sslmode="require",
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--apply", action="store_true", help="Write fixes to the database")
    parser.add_argument("--limit", type=int, default=0, help="Only process this many rows per table")
    parser.add_argument("--quiet", action="store_true", help="Only print summary counts")
    args = parser.parse_args()

    load_env()
    global _SPELL_CHECKER
    _SPELL_CHECKER = make_spell_checker()
    spell = _SPELL_CHECKER
    conn = connect()
    cur = conn.cursor()

    question_limit = f"LIMIT {args.limit}" if args.limit else ""
    choice_limit = f"LIMIT {args.limit}" if args.limit else ""

    cur.execute(
        f"""
        SELECT id, question_text, rationale
        FROM testbank.questions
        ORDER BY id
        {question_limit}
        """
    )
    question_rows = cur.fetchall()

    cur.execute(
        f"""
        SELECT id, choice_text
        FROM testbank.question_choices
        ORDER BY id
        {choice_limit}
        """
    )
    choice_rows = cur.fetchall()

    question_updates: list[tuple[str, str | None, str]] = []
    choice_updates: list[tuple[str, str]] = []

    for row_id, question_text, rationale in question_rows:
        fixed_question = fix_corrupted_text(spell, question_text)
        fixed_rationale = fix_corrupted_text(spell, rationale)
        if fixed_question != question_text or fixed_rationale != rationale:
            question_updates.append((fixed_question, fixed_rationale, row_id))
            if not args.apply and not args.quiet:
                print("QUESTION", row_id)
                if fixed_question != question_text:
                    print("  Q BEFORE:", question_text[:160])
                    print("  Q AFTER :", fixed_question[:160])
                if fixed_rationale != rationale:
                    print("  R BEFORE:", (rationale or "")[:160])
                    print("  R AFTER :", (fixed_rationale or "")[:160])

    for row_id, choice_text in choice_rows:
        fixed_choice = fix_corrupted_text(spell, choice_text)
        if fixed_choice != choice_text:
            choice_updates.append((fixed_choice, row_id))
            if not args.apply and not args.quiet:
                print("CHOICE", row_id)
                print("  BEFORE:", choice_text[:160])
                print("  AFTER :", fixed_choice[:160])

    print(
        f"Prepared {len(question_updates)} question updates and "
        f"{len(choice_updates)} choice updates."
    )

    if not args.apply:
        print("Dry run only. Re-run with --apply to write changes.")
        return

    for fixed_question, fixed_rationale, row_id in question_updates:
        cur.execute(
            """
            UPDATE testbank.questions
            SET question_text = %s, rationale = %s
            WHERE id = %s
            """,
            (fixed_question, fixed_rationale, row_id),
        )

    for fixed_choice, row_id in choice_updates:
        cur.execute(
            """
            UPDATE testbank.question_choices
            SET choice_text = %s
            WHERE id = %s
            """,
            (fixed_choice, row_id),
        )

    conn.commit()
    conn.close()
    print("Database updated.")


if __name__ == "__main__":
    main()
