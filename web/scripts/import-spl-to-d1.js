/**
 * Import SPL (System Prompts Leaks) data into D1 database
 * Processes OpenAI and Anthropic SQL migration files
 *
 * Usage: node scripts/import-spl-to-d1.js
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WEB_DIR = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(WEB_DIR, 'migrations');
const TMP_DIR = path.join(WEB_DIR, 'tmp');
const DB_NAME = 'promptbridge007';

// Process files in order: openai first, then anthropic
const SQL_FILES = [
  '0004_spl_openai.sql',
  '0004_spl_anthropic.sql',
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
        // Check for escaped single quote ''
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

    // Start of single-quoted string
    if (ch === "'") {
      inString = true;
      current += ch;
      i++;
      continue;
    }

    // SQL line comment - skip until newline
    if (ch === '-' && i + 1 < sql.length && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') i++;
      continue;
    }

    // Statement separator
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

  // Handle last statement without trailing semicolon
  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

/**
 * Execute a single SQL statement via wrangler d1 using a temp file
 */
function executeStatement(stmt, index) {
  const tmpFile = path.join(TMP_DIR, `stmt_${index}.sql`);
  try {
    fs.writeFileSync(tmpFile, stmt + ';', 'utf-8');
    const result = execSync(
      `npx wrangler d1 execute ${DB_NAME} --remote --file="${tmpFile}"`,
      {
        cwd: WEB_DIR,
        encoding: 'utf-8',
        timeout: 60000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
    return { success: true };
  } catch (err) {
    const errMsg = err.stderr || err.message || '';
    // FOREIGN KEY constraint - log and continue
    if (errMsg.includes('FOREIGN KEY') || errMsg.includes('foreign key')) {
      console.log(`    ⚠ FK constraint on stmt ${index + 1} - skipping`);
      return { success: false, fkError: true, error: errMsg.substring(0, 200) };
    }
    // UNIQUE constraint - expected for INSERT OR IGNORE
    if (errMsg.includes('UNIQUE constraint') || errMsg.includes('unique constraint')) {
      console.log(`    ⚠ UNIQUE constraint on stmt ${index + 1} - skipping`);
      return { success: false, uniqueError: true, error: errMsg.substring(0, 200) };
    }
    return { success: false, error: errMsg.substring(0, 300) };
  } finally {
    // Clean up temp file
    try { fs.unlinkSync(tmpFile); } catch {}
  }
}

async function main() {
  console.log('=== SPL Import to D1 ===');
  console.log(`Database: ${DB_NAME}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  // Ensure tmp directory exists
  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }

  let grandTotal = 0;
  let grandSuccess = 0;
  let grandFail = 0;
  let grandFkSkip = 0;

  for (const sqlFile of SQL_FILES) {
    const filePath = path.join(MIGRATIONS_DIR, sqlFile);
    if (!fs.existsSync(filePath)) {
      console.log(`SKIP: ${sqlFile} not found`);
      continue;
    }

    const fileSize = (fs.statSync(filePath).size / 1024 / 1024).toFixed(2);
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Processing: ${sqlFile} (${fileSize} MB)`);
    console.log('='.repeat(60));

    const sql = fs.readFileSync(filePath, 'utf-8');
    const statements = parseSqlStatements(sql);
    console.log(`Found ${statements.length} statements\n`);

    let fileSuccess = 0;
    let fileFail = 0;
    let fileFkSkip = 0;
    const errors = [];

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Determine statement type for logging
      let stmtType = 'unknown';
      if (stmt.startsWith('INSERT OR IGNORE INTO files')) stmtType = 'file';
      else if (stmt.startsWith('INSERT INTO tags')) stmtType = 'tag';
      else if (stmt.startsWith('INSERT INTO file_versions')) stmtType = 'version';
      else if (stmt.startsWith('INSERT')) stmtType = 'other-insert';

      const result = executeStatement(stmt, i);

      if (result.success) {
        fileSuccess++;
      } else if (result.fkError) {
        fileFkSkip++;
      } else if (result.uniqueError) {
        fileFkSkip++; // Count as skip, not failure
      } else {
        fileFail++;
        if (errors.length < 5) {
          errors.push(`  Stmt ${i + 1} (${stmtType}): ${result.error}`);
        }
      }

      grandTotal++;

      // Progress logging every 50 statements
      if ((i + 1) % 50 === 0) {
        console.log(`  Progress: ${i + 1}/${statements.length} | OK: ${fileSuccess} | FK/Skip: ${fileFkSkip} | Fail: ${fileFail}`);
      }
    }

    grandSuccess += fileSuccess;
    grandFail += fileFail;
    grandFkSkip += fileFkSkip;

    console.log(`\n  ${sqlFile} complete:`);
    console.log(`    Success: ${fileSuccess}`);
    console.log(`    FK/Skip: ${fileFkSkip}`);
    console.log(`    Failed:  ${fileFail}`);

    if (errors.length > 0) {
      console.log(`  First errors:`);
      errors.forEach(e => console.log(e));
    }
  }

  // Clean up tmp directory if empty
  try {
    const remaining = fs.readdirSync(TMP_DIR);
    if (remaining.length === 0) {
      fs.rmdirSync(TMP_DIR);
      console.log('\nCleaned up tmp/ directory');
    } else {
      console.log(`\ntmp/ directory has ${remaining.length} remaining files`);
    }
  } catch {}

  console.log(`\n${'='.repeat(60)}`);
  console.log('GRAND TOTAL');
  console.log('='.repeat(60));
  console.log(`Total statements: ${grandTotal}`);
  console.log(`Success:          ${grandSuccess}`);
  console.log(`FK/Skip:          ${grandFkSkip}`);
  console.log(`Failed:           ${grandFail}`);
  console.log(`Success rate:     ${grandTotal > 0 ? ((grandSuccess / grandTotal) * 100).toFixed(1) : 0}%`);

  // Verify counts
  console.log(`\n--- Verification ---`);
  try {
    const verifyFiles = execSync(
      `npx wrangler d1 execute ${DB_NAME} --remote --command "SELECT COUNT(*) as cnt FROM files"`,
      { cwd: WEB_DIR, encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const fileMatch = verifyFiles.match(/"cnt":\s*(\d+)/);
    if (fileMatch) console.log(`Total files in D1: ${fileMatch[1]}`);

    const verifyTags = execSync(
      `npx wrangler d1 execute ${DB_NAME} --remote --command "SELECT COUNT(*) as cnt FROM tags"`,
      { cwd: WEB_DIR, encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const tagMatch = verifyTags.match(/"cnt":\s*(\d+)/);
    if (tagMatch) console.log(`Total tags in D1: ${tagMatch[1]}`);

    const verifyVersions = execSync(
      `npx wrangler d1 execute ${DB_NAME} --remote --command "SELECT COUNT(*) as cnt FROM file_versions"`,
      { cwd: WEB_DIR, encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const verMatch = verifyVersions.match(/"cnt":\s*(\d+)/);
    if (verMatch) console.log(`Total file_versions in D1: ${verMatch[1]}`);
  } catch (e) {
    console.log('Verification query failed');
  }

  console.log(`\nDone at ${new Date().toISOString()}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
