/**
 * Batch import Chinese translation SQL files into D1.
 * Groups multiple statements per batch to reduce wrangler process startup overhead.
 *
 * Usage: node scripts/import-zh-batch.js
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

const WEB_DIR = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(WEB_DIR, 'migrations');
const TMP_DIR = path.join(WEB_DIR, 'tmp');
const DB_NAME = 'promptbridge007';

const BATCH_SIZE = 15;

const SQL_FILES = [
  '0005_zh_seed.sql',
  '0005_zh_cursor.sql',
  '0005_zh_qwen.sql',
  '0005_zh_mistral.sql',
  '0005_zh_notion.sql',
  '0005_zh_perplexity.sql',
  '0005_zh_meta.sql',
  '0005_zh_microsoft.sql',
  '0005_zh_misc.sql',
  '0005_zh_xai.sql',
  '0005_zh_google.sql',
  '0005_zh_openai.sql',
  '0005_zh_anthropic.sql',
];

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
        if (sql[i + 1] === "'") {
          current += "'";
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

    if (ch === '-' && sql[i + 1] === '-') {
      while (i < sql.length && sql[i] !== '\n') {
        current += sql[i];
        i++;
      }
      continue;
    }

    if (ch === ';') {
      current += ch;
      const trimmed = current.trim();
      if (trimmed.length > 0 && !trimmed.startsWith('--')) {
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
  if (trimmed.length > 0 && !trimmed.startsWith('--')) {
    statements.push(trimmed);
  }

  return statements;
}

function executeBatch(statements) {
  const tmpFile = path.join(TMP_DIR, `batch_${Date.now()}_${Math.random().toString(36).slice(2,8)}.sql`);
  fs.writeFileSync(tmpFile, statements.join('\n\n'), 'utf-8');

  try {
    const result = execSync(
      `npx wrangler d1 execute ${DB_NAME} --remote --file="${tmpFile}"`,
      { cwd: WEB_DIR, encoding: 'utf-8', stdio: ['pipe', 'pipe', 'pipe'], timeout: 60000 }
    );
    const stderr = '';
    fs.unlinkSync(tmpFile);
    return { success: true, output: result };
  } catch (err) {
    const stderr = err.stderr || '';
    const stdout = err.stdout || '';
    fs.unlinkSync(tmpFile);

    if (stderr.includes('UNIQUE constraint') || stdout.includes('UNIQUE constraint')) {
      return { success: true, skipped: true, output: stderr + stdout };
    }
    if (stderr.includes('FOREIGN KEY constraint') || stdout.includes('FOREIGN KEY constraint')) {
      return { success: true, skipped: true, output: stderr + stdout };
    }
    return { success: false, error: stderr + stdout };
  }
}

function main() {
  console.log('=== Batch Import Chinese Translations to D1 ===');
  console.log(`Database: ${DB_NAME}`);
  console.log(`Batch size: ${BATCH_SIZE}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  if (!fs.existsSync(TMP_DIR)) {
    fs.mkdirSync(TMP_DIR, { recursive: true });
  }

  let totalStatements = 0;
  let totalSuccess = 0;
  let totalSkipped = 0;
  let totalFailed = 0;
  const failedBatches = [];

  for (const sqlFile of SQL_FILES) {
    const filePath = path.join(MIGRATIONS_DIR, sqlFile);
    if (!fs.existsSync(filePath)) {
      console.log(`SKIP (not found): ${sqlFile}\n`);
      continue;
    }

    const fileSizeKB = (fs.statSync(filePath).size / 1024).toFixed(1);
    console.log('='.repeat(60));
    console.log(`Processing: ${sqlFile} (${fileSizeKB} KB)`);
    console.log('='.repeat(60));

    const sql = fs.readFileSync(filePath, 'utf-8');
    const statements = parseSqlStatements(sql);
    console.log(`Found ${statements.length} statements\n`);

    let fileSuccess = 0;
    let fileSkipped = 0;
    let fileFailed = 0;

    for (let i = 0; i < statements.length; i += BATCH_SIZE) {
      const batch = statements.slice(i, i + BATCH_SIZE);
      const batchNum = Math.floor(i / BATCH_SIZE) + 1;
      const totalBatches = Math.ceil(statements.length / BATCH_SIZE);

      process.stdout.write(`  Batch ${batchNum}/${totalBatches} (stmts ${i+1}-${Math.min(i+BATCH_SIZE, statements.length)})... `);

      const result = executeBatch(batch);

      if (result.success && !result.skipped) {
        fileSuccess += batch.length;
        console.log('OK');
      } else if (result.skipped) {
        fileSkipped += batch.length;
        console.log('SKIP');
      } else {
        fileFailed += batch.length;
        failedBatches.push({ file: sqlFile, batchStart: i, batchEnd: i + batch.length, error: result.error });
        console.log('FAIL');
      }
    }

    console.log(`\n  Summary for ${sqlFile}:`);
    console.log(`    Success: ${fileSuccess}`);
    console.log(`    Skipped: ${fileSkipped}`);
    console.log(`    Failed:  ${fileFailed}\n`);

    totalStatements += statements.length;
    totalSuccess += fileSuccess;
    totalSkipped += fileSkipped;
    totalFailed += fileFailed;
  }

  console.log('='.repeat(60));
  console.log('FINAL SUMMARY');
  console.log('='.repeat(60));
  console.log(`  Total statements: ${totalStatements}`);
  console.log(`  Success:          ${totalSuccess}`);
  console.log(`  Skipped:          ${totalSkipped}`);
  console.log(`  Failed:           ${totalFailed}`);
  console.log(`  Success rate:     ${((totalSuccess + totalSkipped) / totalStatements * 100).toFixed(1)}%`);

  if (failedBatches.length > 0) {
    console.log(`\n  Failed batches: ${failedBatches.length}`);
    for (const fb of failedBatches.slice(0, 5)) {
      console.log(`    - ${fb.file}: stmts ${fb.batchStart}-${fb.batchEnd}`);
    }
  }

  console.log('\nDone!');
}

main();
