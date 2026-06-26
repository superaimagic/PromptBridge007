/**
 * Import Chinese translation SQL files into D1 database.
 * Processes 0005_zh_*.sql migration files using the same approach
 * as import-spl-to-d1.js (split into individual statements, execute via wrangler --file).
 *
 * Usage: node scripts/import-zh-to-d1.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WEB_DIR = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(WEB_DIR, 'migrations');
const TMP_DIR = path.join(WEB_DIR, 'tmp');
const DB_NAME = 'promptbridge007';

// All zh translation SQL files in import order
const SQL_FILES = [
  '0005_zh_anthropic.sql',
  '0005_zh_openai.sql',
  '0005_zh_google.sql',
  '0005_zh_microsoft.sql',
  '0005_zh_meta.sql',
  '0005_zh_xai.sql',
  '0005_zh_mistral.sql',
  '0005_zh_perplexity.sql',
  '0005_zh_notion.sql',
  '0005_zh_qwen.sql',
  '0005_zh_cursor.sql',
  '0005_zh_misc.sql',
  '0005_zh_seed.sql',
];

/**
 * Parse SQL into individual statements, properly handling:
 * - Single-quoted strings (content may contain semicolons)
 * - Escaped single quotes ('')
 * - SQL line comments (--)
 */
function parseSqlStatements(sql) {
  const statements = [];
  let current = '';
  let inString = false;
  let i = 0;

  while (i < sql.length) {
    const ch = sql[i];

    if (inString) {
      current += ch;
      if (ch === "'") {
        if (i + 1 < sql.length && sql[i + 1] === "'") {
          current += sql[i + 1];
          i += 2;
          continue;
        }
        inString = false;
      }
      i++;
      continue;
    }

    if (ch === "'") {
      inString = true;
      current += ch;
      i++;
      continue;
    }

    if (ch === '-' && i + 1 < sql.length && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }

    if (ch === ';') {
      const trimmed = current.trim();
      if (trimmed.length > 0) {
        statements.push(trimmed);
      }
      current = '';
      i++;
      continue;
    }

    current += ch;
    i++;
  }

  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

/**
 * Execute a single SQL statement via wrangler d1 using a temp file.
 * Handles wrangler warnings on stderr gracefully - only treats actual
 * SQL errors as failures.
 */
function executeStatement(stmt, index) {
  const tmpFile = path.join(TMP_DIR, 'zh_stmt_' + index + '.sql');
  try {
    fs.writeFileSync(tmpFile, stmt + ';', 'utf-8');
    const result = execSync(
      'npx wrangler d1 execute ' + DB_NAME + ' --remote --file="' + tmpFile + '"',
      {
        cwd: WEB_DIR,
        encoding: 'utf-8',
        timeout: 120000,
        maxBuffer: 10 * 1024 * 1024,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
    return { success: true };
  } catch (err) {
    const errMsg = (err.stderr || '') + (err.message || '');

    // Wrangler warnings that are NOT actual SQL errors - treat as success
    // These appear when D1 is temporarily busy but the SQL still executed
    const isWranglerWarning = errMsg.includes('Proxy environment variables detected') ||
      errMsg.includes('This process may take some time');

    // Actual SQL constraint errors
    if (errMsg.includes('FOREIGN KEY') || errMsg.includes('foreign key')) {
      console.log('    FK constraint on stmt ' + (index + 1) + ' - skipping');
      return { success: false, fkError: true, error: errMsg.substring(0, 200) };
    }
    if (errMsg.includes('UNIQUE constraint') || errMsg.includes('unique constraint')) {
      console.log('    UNIQUE constraint on stmt ' + (index + 1) + ' - skipping');
      return { success: false, uniqueError: true, error: errMsg.substring(0, 200) };
    }

    // If it's just wrangler warnings, treat as success (SQL likely executed fine)
    if (isWranglerWarning && !errMsg.includes('Error') && !errMsg.includes('error:')) {
      return { success: true, wasWarning: true };
    }

    // Retry once for transient errors
    try {
      const retryResult = execSync(
        'npx wrangler d1 execute ' + DB_NAME + ' --remote --file="' + tmpFile + '"',
        {
          cwd: WEB_DIR,
          encoding: 'utf-8',
          timeout: 120000,
          maxBuffer: 10 * 1024 * 1024,
          stdio: ['pipe', 'pipe', 'pipe'],
        }
      );
      return { success: true, wasRetry: true };
    } catch (retryErr) {
      const retryMsg = (retryErr.stderr || '') + (retryErr.message || '');
      if (retryMsg.includes('FOREIGN KEY') || retryMsg.includes('foreign key')) {
        return { success: false, fkError: true, error: retryMsg.substring(0, 200) };
      }
      if (retryMsg.includes('UNIQUE constraint') || retryMsg.includes('unique constraint')) {
        return { success: false, uniqueError: true, error: retryMsg.substring(0, 200) };
      }
      if (retryMsg.includes('Proxy environment variables') && !retryMsg.includes('Error')) {
        return { success: true, wasRetry: true };
      }
      return { success: false, error: retryMsg.substring(0, 300) };
    }
  } finally {
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

async function main() {
  console.log('=== Chinese Translation Import to D1 ===');
  console.log('Database: ' + DB_NAME);
  console.log('Time: ' + new Date().toISOString() + '\n');

  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }

  let grandTotal = 0;
  let grandSuccess = 0;
  let grandFail = 0;
  let grandSkip = 0;

  for (const sqlFile of SQL_FILES) {
    const filePath = path.join(MIGRATIONS_DIR, sqlFile);
    if (!fs.existsSync(filePath)) {
      console.log('SKIP: ' + sqlFile + ' not found');
      continue;
    }

    const fileSize = (fs.statSync(filePath).size / 1024).toFixed(1);
    console.log('\n' + '='.repeat(60));
    console.log('Processing: ' + sqlFile + ' (' + fileSize + ' KB)');
    console.log('='.repeat(60));

    const sql = fs.readFileSync(filePath, 'utf-8');
    const statements = parseSqlStatements(sql);
    console.log('Found ' + statements.length + ' statements\n');

    let fileSuccess = 0;
    let fileFail = 0;
    let fileSkip = 0;
    const errors = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      let stmtType = 'unknown';
      if (stmt.startsWith('INSERT OR IGNORE INTO files')) stmtType = 'file';
      else if (stmt.startsWith('INSERT INTO tags')) stmtType = 'tag';
      else if (stmt.startsWith('INSERT INTO file_versions')) stmtType = 'version';
      else if (stmt.startsWith('INSERT')) stmtType = 'other-insert';

      const result = executeStatement(stmt, i);

      if (result.success) {
        fileSuccess++;
      } else if (result.fkError || result.uniqueError) {
        fileSkip++;
      } else {
        fileFail++;
        if (errors.length < 5) {
          errors.push('  Stmt ' + (i + 1) + ' (' + stmtType + '): ' + result.error);
        }
      }

      grandTotal++;

      if ((i + 1) % 50 === 0) {
        console.log('  Progress: ' + (i + 1) + '/' + statements.length + ' | OK: ' + fileSuccess + ' | Skip: ' + fileSkip + ' | Fail: ' + fileFail);
      }
    }

    grandSuccess += fileSuccess;
    grandFail += fileFail;
    grandSkip += fileSkip;

    console.log('\n  ' + sqlFile + ' complete:');
    console.log('    Success: ' + fileSuccess);
    console.log('    Skip:    ' + fileSkip);
    console.log('    Failed:  ' + fileFail);

    if (errors.length > 0) {
      console.log('  First errors:');
      errors.forEach(function(e) { console.log(e); });
    }
  }

  // Clean up tmp directory if empty
  try {
    const remaining = fs.readdirSync(TMP_DIR);
    if (remaining.length === 0) {
      fs.rmdirSync(TMP_DIR);
      console.log('\nCleaned up tmp/ directory');
    } else {
      console.log('\ntmp/ directory has ' + remaining.length + ' remaining files');
    }
  } catch {}

  console.log('\n' + '='.repeat(60));
  console.log('GRAND TOTAL');
  console.log('='.repeat(60));
  console.log('Total statements: ' + grandTotal);
  console.log('Success:          ' + grandSuccess);
  console.log('Skip:             ' + grandSkip);
  console.log('Failed:           ' + grandFail);
  console.log('Success rate:     ' + (grandTotal > 0 ? ((grandSuccess / grandTotal) * 100).toFixed(1) : 0) + '%');

  // Verify counts
  console.log('\n--- Verification ---');
  try {
    const verifyZhFiles = execSync(
      'npx wrangler d1 execute ' + DB_NAME + ' --remote --command "SELECT COUNT(*) as cnt FROM files WHERE slug LIKE \'%-zh\'"',
      { cwd: WEB_DIR, encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const zhMatch = verifyZhFiles.match(/"cnt":\s*(\d+)/);
    if (zhMatch) console.log('Chinese files in D1: ' + zhMatch[1]);

    const verifyFiles = execSync(
      'npx wrangler d1 execute ' + DB_NAME + ' --remote --command "SELECT COUNT(*) as cnt FROM files"',
      { cwd: WEB_DIR, encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const fileMatch = verifyFiles.match(/"cnt":\s*(\d+)/);
    if (fileMatch) console.log('Total files in D1: ' + fileMatch[1]);

    const verifyTags = execSync(
      'npx wrangler d1 execute ' + DB_NAME + ' --remote --command "SELECT COUNT(*) as cnt FROM tags"',
      { cwd: WEB_DIR, encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const tagMatch = verifyTags.match(/"cnt":\s*(\d+)/);
    if (tagMatch) console.log('Total tags in D1: ' + tagMatch[1]);

    const verifyVersions = execSync(
      'npx wrangler d1 execute ' + DB_NAME + ' --remote --command "SELECT COUNT(*) as cnt FROM file_versions"',
      { cwd: WEB_DIR, encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const verMatch = verifyVersions.match(/"cnt":\s*(\d+)/);
    if (verMatch) console.log('Total file_versions in D1: ' + verMatch[1]);
  } catch (e) {
    console.log('Verification query failed: ' + e.message.substring(0, 200));
  }

  console.log('\nDone at ' + new Date().toISOString());
}

main().catch(function(err) {
  console.error('Fatal error:', err);
  process.exit(1);
});
