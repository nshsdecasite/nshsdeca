-- Generated PI sets are shared across the chapter, so they do not need an owner.

ALTER TABLE content.flashcard_sets
    ALTER COLUMN created_by DROP NOT NULL;
