#!/usr/bin/env node
/**
 * Bulk-load exam SQL chunks via Supabase MCP execute_sql.
 * Uses Cursor's encrypted OAuth tokens from globalStorage state.vscdb.
 *
 * Run with Cursor's Electron so safeStorage can decrypt tokens:
 *   ELECTRON_RUN_AS_NODE=1 \
 *   "/Applications/Cursor.app/Contents/MacOS/Cursor" \
 *   scripts/mcp_bulk_load.js [--start 1] [--end 229]
 */

const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');

const PROJECT_ID = 'tfrwksqmuxrtqfehzuti';
const CHUNK_DIR = path.join(__dirname, '..', 'data', 'exams', 'sql_chunks');
const LOG_PATH = path.join(__dirname, '..', 'data', 'exams', 'chunk_load_log.json');
const MCP_URL = 'https://mcp.supabase.com/mcp';
const TOKEN_KEY =
  'mcpOAuth.secret.W3BsdWdpbi1zdXBhYmFzZS1zdXBhYmFzZTo6bWNwU2NvcGU6cHJvZmlsZTpaR1ZtWVhWc2RBXSBtY3BfdG9rZW5z';
const STATE_DB = path.join(
  process.env.HOME,
  'Library/Application Support/Cursor/User/globalStorage/state.vscdb'
);

function parseArgs() {
  const args = { start: 1, end: 229 };
  for (let i = 2; i < process.argv.length; i++) {
    if (process.argv[i] === '--start') args.start = Number(process.argv[++i]);
    if (process.argv[i] === '--end') args.end = Number(process.argv[++i]);
  }
  return args;
}

function readEncryptedTokens() {
  const out = execFileSync(
    'sqlite3',
    [STATE_DB, `SELECT value FROM ItemTable WHERE key='${TOKEN_KEY}';`],
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  ).trim();
  if (!out) throw new Error('MCP OAuth tokens not found in Cursor state DB');
  return JSON.parse(out);
}

function decryptTokens(enc) {
  let safeStorage;
  try {
    ({ safeStorage } = require('electron'));
  } catch (e) {
    throw new Error(
      'Run with Cursor Electron: ELECTRON_RUN_AS_NODE=1 "/Applications/Cursor.app/Contents/MacOS/Cursor" scripts/mcp_bulk_load.js'
    );
  }
  if (!safeStorage.isEncryptionAvailable()) {
    throw new Error('Electron safeStorage encryption not available');
  }
  const buf = Buffer.from(enc.data);
  const json = safeStorage.decryptString(buf);
  return JSON.parse(json);
}

async function mcpCall(accessToken, method, params, sessionId) {
  const headers = {
    'Content-Type': 'application/json',
    Accept: 'application/json, text/event-stream',
    Authorization: `Bearer ${accessToken}`,
  };
  if (sessionId) headers['Mcp-Session-Id'] = sessionId;

  const body = {
    jsonrpc: '2.0',
    id: Date.now(),
    method,
    params,
  };

  const resp = await fetch(MCP_URL, { method: 'POST', headers, body: JSON.stringify(body) });
  const newSession = resp.headers.get('mcp-session-id') || sessionId;
  const text = await resp.text();

  let data;
  try {
    data = JSON.parse(text);
  } catch {
    // SSE fallback
    const line = text.split('\n').find((l) => l.startsWith('data: '));
    data = line ? JSON.parse(line.slice(6)) : { error: { message: text.slice(0, 500) } };
  }
  return { data, sessionId: newSession, status: resp.status };
}

async function initialize(accessToken) {
  const init = await mcpCall(accessToken, 'initialize', {
    protocolVersion: '2024-11-05',
    capabilities: {},
    clientInfo: { name: 'nshs-deca-chunk-loader', version: '1.0.0' },
  });
  if (init.data.error) throw new Error(`initialize failed: ${JSON.stringify(init.data.error)}`);
  await mcpCall(
    accessToken,
    'notifications/initialized',
    {},
    init.sessionId
  );
  return init.sessionId;
}

async function executeSql(accessToken, sessionId, query) {
  const result = await mcpCall(
    accessToken,
    'tools/call',
    {
      name: 'execute_sql',
      arguments: { project_id: PROJECT_ID, query },
    },
    sessionId
  );
  if (result.data.error) {
    throw new Error(JSON.stringify(result.data.error));
  }
  const content = result.data.result?.content;
  if (Array.isArray(content)) {
    const text = content.map((c) => c.text || '').join('\n');
    if (/error|failed|ZodError/i.test(text) && !/\[\]/.test(text)) {
      throw new Error(text.slice(0, 500));
    }
  }
  return result;
}

async function main() {
  const { start, end } = parseArgs();
  const enc = await readEncryptedTokens();
  const tokens = decryptTokens(enc);
  const accessToken = tokens.access_token;
  if (!accessToken) throw new Error('No access_token in decrypted MCP OAuth tokens');

  const sessionId = await initialize(accessToken);

  const log = {
    project_id: PROJECT_ID,
    method: 'mcp_execute_sql_node',
    total: end - start + 1,
    success: 0,
    failed: [],
    chunks: {},
  };

  for (let i = start; i <= end; i++) {
    const file = path.join(CHUNK_DIR, `chunk_${String(i).padStart(3, '0')}.sql`);
    const query = fs.readFileSync(file, 'utf8');
    process.stdout.write(`chunk ${String(i).padStart(3, '0')} (${query.length} bytes)... `);
    try {
      await executeSql(accessToken, sessionId, query);
      log.success += 1;
      log.chunks[String(i).padStart(3, '0')] = { status: 'success', bytes: query.length };
      process.stdout.write('OK\n');
    } catch (err) {
      const msg = err.message || String(err);
      log.failed.push({ chunk: i, error: msg.slice(0, 1000) });
      log.chunks[String(i).padStart(3, '0')] = { status: 'failed', error: msg.slice(0, 1000) };
      process.stdout.write(`FAIL: ${msg.slice(0, 120)}\n`);
    }
  }

  log.failed_count = log.failed.length;
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));

  // Verification queries
  const counts = {};
  for (const table of ['exams', 'questions', 'question_choices', 'exam_questions', 'exam_events']) {
    const q = `SELECT count(*) AS c FROM testbank.${table};`;
    const res = await executeSql(accessToken, sessionId, q);
    const text = JSON.stringify(res.data);
    const m = text.match(/"c"\s*:\s*(\d+)/);
    counts[table] = m ? Number(m[1]) : null;
  }
  log.verification = counts;
  fs.writeFileSync(LOG_PATH, JSON.stringify(log, null, 2));

  console.log('\n=== SUMMARY ===');
  console.log(`Applied: ${log.success}/${log.total}`);
  console.log(`Failed: ${log.failed_count}`);
  if (log.failed.length) {
    for (const f of log.failed.slice(0, 10)) {
      console.log(`  chunk ${f.chunk}: ${f.error.slice(0, 120)}`);
    }
  }
  console.log('Counts:', counts);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
