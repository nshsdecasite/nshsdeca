from fix_testbank_text import fix_corrupted_text, load_env
from spellchecker import SpellChecker

load_env()
spell = SpellChecker()
samples = [
    "Brandon has been given a 385-page report and does not have time to review the entire doc ument, but he does need to understand specific information that is included in the report. What section of the repor t will guide Brandon to the information he needs?",
    "Which of the following is the primary activity performed during the execution pha se of a project:",
    '"S" corporatio',
    "Partnershi",
    "Acknowledging directions verbally or nonverball",
    "Contribute in a useful wa",
    "To write copy for promotional brochures 1 8. It is important for employees to demonstrate a customer-service mindset when they ar",
    "T o obtain the correct information, Kevin should",
    "Face- to-face meetin",
]
for sample in samples:
    fixed = fix_corrupted_text(spell, sample)
    print("IN :", sample)
    print("OUT:", fixed)
    print()
