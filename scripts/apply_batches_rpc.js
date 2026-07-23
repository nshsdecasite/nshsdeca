#!/usr/bin/env node
/**
 * Retry failed SQL batches via exec_bulk_sql RPC.
 * Usage: node scripts/apply_batches_rpc.js --retry-failed
 */
const fs = require("fs");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "..", ".env") });
const { createClient } = require("@supabase/supabase-js");

const ROOT = path.join(__dirname, "..");
const SQL_DIR = path.join(ROOT, "data/exams/sql_batches");
const LOG_PATH = path.join(ROOT, "data/exams/batch_load_log.json");

function writeLog(log) {
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2) + "\n");
}

async function reloadSchema(supabase) {
  await supabase.rpc("exec_bulk_sql", { q: "NOTIFY pgrst, 'reload schema';" });
}

async function main() {
  const retryFailed = process.argv.includes("--retry-failed");
  const supabase = createClient(
    process.env.SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let log = JSON.parse(fs.readFileSync(LOG_PATH, "utf8"));
  const allBatches = fs
    .readdirSync(SQL_DIR)
    .filter((f) => f.endsWith(".sql"))
    .sort((a, b) => parseInt(a, 10) - parseInt(b, 10));

  let batches;
  if (retryFailed) {
    const failedSet = new Set(log.failed.map((f) => f.batch));
    batches = allBatches.filter((b) => failedSet.has(b));
    log.failed = [];
    log.failed_count = 0;
  } else {
    log = { total: 700, success: 0, failed_count: 0, failed: [] };
    batches = allBatches;
  }

  await reloadSchema(supabase);

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const sql = fs.readFileSync(path.join(SQL_DIR, batch), "utf8");
    try {
      const { error } = await supabase.rpc("exec_bulk_sql", { q: sql });
      if (error) throw new Error(error.message || JSON.stringify(error));
      if (!retryFailed) {
        log.success += 1;
      } else {
        log.success += 1;
      }
      if (retryFailed) {
        log.failed = log.failed.filter((f) => f.batch !== batch);
        log.failed_count = log.failed.length;
      }
    } catch (err) {
      log.failed_count += 1;
      log.failed.push({ batch, error: String(err.message || err).slice(0, 500) });
      if (String(err.message || err).includes("schema cache")) {
        await reloadSchema(supabase);
        await new Promise((r) => setTimeout(r, 1000));
      }
    }
    if ((i + 1) % 25 === 0 || i + 1 === batches.length) {
      writeLog(log);
      console.log(
        `progress ${i + 1}/${batches.length} success=${log.success} failed=${log.failed_count}`,
      );
    }
  }

  writeLog(log);
  console.log(JSON.stringify(log, null, 2));
  process.exit(log.failed_count > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
