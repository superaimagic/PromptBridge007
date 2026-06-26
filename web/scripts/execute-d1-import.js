/**
 * Execute SQL files against D1 using wrangler
 * Splits large SQL files into individual statements and executes them one by one
 */
const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const MIGRATIONS_DIR = path.join(__dirname, '..', 'migrations');
const DB_NAME = 'promptbridge007';

// SQL files to execute in order
const SQL_FILES = [
  '0004_spl_source.sql',
  '0004_spl_cursor.sql',
  '0004_spl_qwen.sql',
  '0004_spl_mistral.sql',
  '0004_spl_notion.sql',
  '0004_spl_perplexity.sql',
  '0004_spl_meta.sql',
  '0004_spl_xai.sql',
  '0004_spl_microsoft.sql',
  '0004_spl_misc.sql',
  '0004_spl_google.sql',
  '0004_spl_openai.sql',
  '0004_spl_anthropic.sql',
];

/**
 * Parse SQL file into individual statements, respecting quoted strings.
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

function executeSql(sql) {
  try {
    const result = execSync(
      `npx wrangler d1 execute ${DB_NAME} --remote --command "${sql.replace(/"/g, '\\"')}"`,
      {
        cwd: path.join(__dirname, '..'),
        encoding: 'utf-8',
        timeout: 30000,
        stdio: ['pipe', 'pipe', 'pipe'],
      }
    );
    return { success: true };
  } catch (err) {
    return { success: false, error: err.message.substring(0, 200) };
  }
}

async function main() {
  console.log('=== Executing SQL imports via wrangler ===\n');

  let totalSuccess = 0;
  let totalFail = 0;

  for (const sqlFile of SQL_FILES) {
    const filePath = path.join(MIGRATIONS_DIR, sqlFile);
    if (!fs.existsSync(filePath)) {
      console.log(`SKIP: ${sqlFile} not found`);
      continue;
    }

    console.log(`\nProcessing: ${sqlFile}`);
    const sql = fs.readFileSync(filePath, 'utf-8');
    const statements = parseSqlStatements(sql);
    console.log(`  Found ${statements.length} statements`);

    let fileSuccess = 0;
    let fileFail = 0;

    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i];

      // Skip statements that are too long for --command (use --file instead for large ones)
      if (Buffer.byteLength(stmt, 'utf-8') > 90000) {
        // Write to temp file and use --file
        const tmpFile = path.join(MIGRATIONS_DIR, '_tmp_large_stmt.sql');
        fs.writeFileSync(tmpFile, stmt + ';');
        try {
          execSync(
            `npx wrangler d1 execute ${DB_NAME} --remote --file "${tmpFile}"`,
            { cwd: path.join(__dirname, '..'), encoding: 'utf-8', timeout: 60000, stdio: ['pipe', 'pipe', 'pipe'] }
          );
          fileSuccess++;
        } catch (err) {
          fileFail++;
          console.error(`  Error on large statement ${i + 1}: ${err.message.substring(0, 150)}`);
        }
        try { fs.unlinkSync(tmpFile); } catch {}
        continue;
      }

      const result = executeSql(stmt);
      if (result.success) {
        fileSuccess++;
      } else {
        fileFail++;
        if (fileFail <= 3) {
          console.error(`  Error on statement ${i + 1}: ${result.error}`);
        }
      }

      if ((i + 1) % 20 === 0) {
        console.log(`  Progress: ${i + 1}/${statements.length} (${fileSuccess} ok, ${fileFail} failed)`);
      }
    }

    totalSuccess += fileSuccess;
    totalFail += fileFail;
    console.log(`  ${sqlFile}: ${fileSuccess} ok, ${fileFail} failed`);
  }

  console.log(`\n=== Import Complete ===`);
  console.log(`Total success: ${totalSuccess}`);
  console.log(`Total failed: ${totalFail}`);

  // Verify
  try {
    const verifyResult = execSync(
      `npx wrangler d1 execute ${DB_NAME} --remote --command "SELECT COUNT(*) as cnt FROM files"`,
      { cwd: path.join(__dirname, '..'), encoding: 'utf-8', timeout: 15000, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    const match = verifyResult.match(/"cnt":\s*(\d+)/);
    if (match) {
      console.log(`Total files in D1: ${match[1]}`);
    }
  } catch (e) {
    console.error('Verification failed');
  }
}

main().catch(console.error);
