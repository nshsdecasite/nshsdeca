# Newman Smith DECA Platform — Schema v5 (PDF-aligned)

Legend: **PK** = primary key. `FK -> schema.table` = foreign key. `?` = nullable.

**Migration:** `supabase/migrations/20260723180000_pdf_aligned_schema.sql`  
**Context prompt:** `.cursor/cursor_context_prompt.md` (section 3)

v5 aligns the schema to the **402 roleplay PDFs** and **68 cluster exam PDFs** in `data/roleplays/` and `data/exams/`. Removed tables/columns that cannot be populated from those files.

---

## Changelog: v4 → v5

### Removed (not in PDFs)

| Item | Reason |
|------|--------|
| `practice.performance_elements` | Element hierarchy not in roleplay/exam PDFs |
| `practice.pi_blueprints` + `blueprint_events` + `blueprint_performance_indicators` + `blueprint_pi_events` | Require separate ~150-PI cluster blueprint PDFs (not downloaded) |
| `events.scenario_judge_questions` | 0% of PDFs have a separate judge-question list; embedded in `judge_characterization` |
| `testbank.questions.difficulty` | Not per-question in any exam PDF |
| `testbank.questions.question_type` | All 68 exams are multiple-choice A–D only |
| `rubric.rubric_templates.presentation_weight` | Not in roleplay PDFs (lives in DECA Guide, not case studies) |
| `events.event_performance_indicators.tier_id` | Tiers not printed on roleplay covers |
| `practice.instructional_areas.standard_text` | Not in PDFs |
| `testbank.sources.publisher` | Not reliably parseable from citations |

`content.vocab_terms`, `content.theories`, and `content.visuals` are **kept** — curated chapter content, not loaded from roleplay/exam PDFs.

### Added / changed

| Item | Source |
|------|--------|
| `events.event_performance_indicators.year` + `indicator_text` | Roleplay cover changes per year; plain English text (no PI codes on cover) |
| `events.event_performance_indicators.pi_id` now nullable | Linked after fuzzy match to master bank |
| `events.scenarios.career_pathway` | 63% of roleplay PDFs |
| `rubric.rubric_templates.level` | Evaluation forms are district/state/icdc-specific |
| `testbank.exams.cluster_id` | Required; derived from exam slug |
| `testbank.sources.citation_text` | Raw `SOURCE:` block from answer key |

---

## Schemas

```sql
CREATE SCHEMA practice;   -- clusters, instructional areas, PI master bank
CREATE SCHEMA events;     -- events, scenarios, event PI lists
CREATE SCHEMA rubric;     -- rubric templates + user submissions/scores
CREATE SCHEMA testbank;   -- exams, questions, practice sessions
CREATE SCHEMA content;    -- vocab, flashcards, theories, visuals, notes
CREATE SCHEMA core;       -- users, chapters, tracking
```

Full `CREATE TABLE` statements: see migration file or `cursor_context_prompt.md`.

---

## Row counts after full PDF load (estimate)

| Table | Rows |
|-------|------|
| `events.scenarios` | 402 |
| `events.event_performance_indicators` | ~1,400 (271 event-years × ~5 PIs) |
| `rubric.rubric_templates` | ~271 |
| `rubric.rubric_criteria` | ~2,700 |
| `rubric.rubric_levels` | ~10,800 |
| `testbank.exams` | 68 |
| `testbank.questions` | ~6,800 |
| `testbank.question_choices` | ~27,200 |
| `testbank.exam_questions` | ~6,800 |
| `practice.performance_indicators` | ~500–800 unique (from exam SOURCE lines) |

---

## Open questions

- `solution_text` absent on ~86% of roleplays — leave null; UI should handle gracefully.
- Pre-2024 exams lack on-page event lists — loader needs static `cluster_slug → [event_codes]` map for `exam_events`.
- Roleplay cover PIs need fuzzy match to `practice.performance_indicators` — codes only come from exam keys.
