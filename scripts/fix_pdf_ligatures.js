#!/usr/bin/env node
/**
 * Fix PDF ligature corruption (ti -> 5, (, U) across DB text columns.
 * Usage: node scripts/fix_pdf_ligatures.js [--verify-only]
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.join(__dirname, "..");
const BATCH = 400;

const JOBS = [
  ["practice.instructional_areas", "name"],
  ["practice.performance_indicators", "indicator_text"],
  ["rubric.rubric_criteria", "criterion_text"],
  ["testbank.questions", "question_text"],
  ["testbank.questions", "rationale"],
  ["testbank.question_choices", "choice_text"],
];

function corruptWhere(column) {
  return (
    `${column} ~ '[a-z]55[a-z]' OR ` +
    `${column} ~ '[a-zA-Z]5[a-z]' OR ` +
    `${column} ~ '[a-zA-Z]\\([a-z]' OR ` +
    `${column} ~ '[a-z]U[a-z]' OR ` +
    `${column} ~ '\\s5mely' OR ` +
    `${column} ~ '\\s5me'`
  );
}

async function sql(supabase, q) {
  const { error } = await supabase.rpc("exec_bulk_sql", { q });
  if (error) throw new Error(error.message || JSON.stringify(error));
}

async function ensureFunction(supabase) {
  const migration = fs.readFileSync(
    path.join(ROOT, "supabase/migrations/20260724170000_fix_pdf_ligature_corruption.sql"),
    "utf8",
  );
  const functionSql = migration.split("-- Instructional areas")[0].trim();
  await sql(supabase, functionSql);
}

async function refreshVerifyTable(supabase) {
  const unions = JOBS.map(
    ([table, column]) => `
    SELECT '${table}' AS tbl, '${column}' AS col, count(*)::int AS n
    FROM ${table}
    WHERE ${corruptWhere(column)}`,
  ).join("\n    UNION ALL\n");

  await sql(supabase, "DROP TABLE IF EXISTS public.ligature_verify;");
  await sql(
    supabase,
    `CREATE TABLE public.ligature_verify AS ${unions};`,
  );
  await sql(
    supabase,
    `
    GRANT SELECT ON public.ligature_verify TO anon, authenticated, service_role;
    `,
  );
  await sql(supabase, "NOTIFY pgrst, 'reload schema';");
  await new Promise((r) => setTimeout(r, 1500));
}

async function readCounts(supabase) {
  const { data, error } = await supabase
    .from("ligature_verify")
    .select("tbl,col,n")
    .order("tbl")
    .order("col");
  if (error) throw new Error(error.message || JSON.stringify(error));
  return data || [];
}

async function printCounts(supabase) {
  await refreshVerifyTable(supabase);
  const rows = await readCounts(supabase);
  let total = 0;
  for (const row of rows) {
    const status = row.n === 0 ? "OK" : "CORRUPT";
    console.log(`${status.padEnd(8)} ${String(row.n).padStart(5)}  ${row.tbl}.${row.col}`);
    total += row.n;
  }
  console.log(`\nTotal corrupt rows: ${total}`);
  return total;
}

async function fixTable(supabase, table, column) {
  const q = `
    WITH batch AS (
      SELECT id
      FROM ${table}
      WHERE ${corruptWhere(column)}
      ORDER BY id
      LIMIT ${BATCH}
    )
    UPDATE ${table} t
    SET ${column} = practice.fix_pdf_ligatures(${column})
    FROM batch
    WHERE t.id = batch.id;
  `;
  await sql(supabase, q);
}

async function relinkRubricPiIds(supabase) {
  await sql(
    supabase,
    `
    UPDATE rubric.rubric_criteria rc
    SET pi_id = pi.id
    FROM practice.performance_indicators pi
    WHERE rc.criterion_group = 'performance_indicator'
      AND practice.normalize_pi_text(rc.criterion_text) = practice.normalize_pi_text(pi.indicator_text)
      AND (rc.pi_id IS NULL OR rc.pi_id <> pi.id);
    `,
  );
}

async function main() {
  const verifyOnly = process.argv.includes("--verify-only");
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  if (!verifyOnly) {
    console.log("Ensuring fix function exists...");
    await ensureFunction(supabase);
  }

  if (verifyOnly) {
    await printCounts(supabase);
    return;
  }

  for (const [table, column] of JOBS) {
    let remaining = Infinity;
    let rounds = 0;
    while (remaining > 0 && rounds < 500) {
      await fixTable(supabase, table, column);
      rounds += 1;
      await refreshVerifyTable(supabase);
      const rows = await readCounts(supabase);
      const match = rows.find((r) => r.tbl === table && r.col === column);
      remaining = match ? match.n : 0;
      if (rounds === 1 || rounds % 5 === 0 || remaining === 0) {
        console.log(`  ${table}.${column}: round ${rounds}, ${remaining} remaining`);
      }
      if (remaining > 0) {
        await new Promise((r) => setTimeout(r, 100));
      }
    }
    if (remaining > 0) {
      console.warn(`WARNING: ${remaining} rows still corrupt in ${table}.${column}`);
    } else {
      console.log(`OK ${table}.${column}`);
    }
  }

  console.log("Re-linking rubric pi_id...");
  await relinkRubricPiIds(supabase);

  console.log("\nFinal verification:");
  const total = await printCounts(supabase);
  process.exit(total > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
