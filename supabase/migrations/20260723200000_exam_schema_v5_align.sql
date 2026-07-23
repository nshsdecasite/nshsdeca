-- Align live exam tables to v5: cluster_id, citation_text, read policies.

-- -----------------------------------------------------------------------------
-- testbank.exams.cluster_id
-- -----------------------------------------------------------------------------
ALTER TABLE testbank.exams
    ADD COLUMN IF NOT EXISTS cluster_id uuid REFERENCES practice.clusters(id);

UPDATE testbank.exams e
SET cluster_id = c.id
FROM practice.clusters c
WHERE e.cluster_id IS NULL
  AND c.slug = CASE split_part(e.exam_code, '-', 1)
    WHEN 'bac' THEN 'principles'
    WHEN 'bma' THEN 'business-management-and-administration'
    WHEN 'entrepreneurship' THEN 'entrepreneurship'
    WHEN 'finance' THEN 'finance'
    WHEN 'hospitality' THEN 'hospitality-and-tourism'
    WHEN 'marketing' THEN 'marketing'
    WHEN 'pfl' THEN 'personal-financial-literacy'
  END;

ALTER TABLE testbank.exams
    ALTER COLUMN cluster_id SET NOT NULL;

-- -----------------------------------------------------------------------------
-- testbank.sources.citation_text
-- -----------------------------------------------------------------------------
ALTER TABLE testbank.sources
    ADD COLUMN IF NOT EXISTS citation_text text;

UPDATE testbank.sources
SET citation_text = title
WHERE citation_text IS NULL;

ALTER TABLE testbank.sources
    ALTER COLUMN citation_text SET NOT NULL;

CREATE UNIQUE INDEX IF NOT EXISTS sources_citation_text_key
    ON testbank.sources (citation_text);

-- -----------------------------------------------------------------------------
-- testbank read policies (RLS is already enabled)
-- -----------------------------------------------------------------------------
DO $$
DECLARE
    tbl text;
BEGIN
    FOREACH tbl IN ARRAY ARRAY[
        'exams',
        'questions',
        'question_choices',
        'exam_questions',
        'exam_events',
        'sources',
        'lap_modules'
    ]
    LOOP
        EXECUTE format('DROP POLICY IF EXISTS %I ON testbank.%I', tbl || '_select', tbl);
        EXECUTE format(
            'CREATE POLICY %I ON testbank.%I FOR SELECT TO authenticated, anon USING (true)',
            tbl || '_select',
            tbl
        );
    END LOOP;
END $$;

-- User-owned practice session data (core.users.id = auth.uid())
DROP POLICY IF EXISTS test_sessions_select ON testbank.test_sessions;
CREATE POLICY test_sessions_select ON testbank.test_sessions
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS test_sessions_insert ON testbank.test_sessions;
CREATE POLICY test_sessions_insert ON testbank.test_sessions
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS test_sessions_update ON testbank.test_sessions;
CREATE POLICY test_sessions_update ON testbank.test_sessions
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS test_answers_select ON testbank.test_answers;
CREATE POLICY test_answers_select ON testbank.test_answers
    FOR SELECT TO authenticated
    USING (
        session_id IN (
            SELECT id FROM testbank.test_sessions WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS test_answers_insert ON testbank.test_answers;
CREATE POLICY test_answers_insert ON testbank.test_answers
    FOR INSERT TO authenticated
    WITH CHECK (
        session_id IN (
            SELECT id FROM testbank.test_sessions WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS test_answers_update ON testbank.test_answers;
CREATE POLICY test_answers_update ON testbank.test_answers
    FOR UPDATE TO authenticated
    USING (
        session_id IN (
            SELECT id FROM testbank.test_sessions WHERE user_id = auth.uid()
        )
    )
    WITH CHECK (
        session_id IN (
            SELECT id FROM testbank.test_sessions WHERE user_id = auth.uid()
        )
    );

DROP POLICY IF EXISTS test_notes_select ON testbank.test_notes;
CREATE POLICY test_notes_select ON testbank.test_notes
    FOR SELECT TO authenticated
    USING (user_id = auth.uid());

DROP POLICY IF EXISTS test_notes_insert ON testbank.test_notes;
CREATE POLICY test_notes_insert ON testbank.test_notes
    FOR INSERT TO authenticated
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS test_notes_update ON testbank.test_notes;
CREATE POLICY test_notes_update ON testbank.test_notes
    FOR UPDATE TO authenticated
    USING (user_id = auth.uid())
    WITH CHECK (user_id = auth.uid());

DROP POLICY IF EXISTS test_notes_delete ON testbank.test_notes;
CREATE POLICY test_notes_delete ON testbank.test_notes
    FOR DELETE TO authenticated
    USING (user_id = auth.uid());
