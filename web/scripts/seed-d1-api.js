// Seed D1 database via Cloudflare API
// Uses proper SQL statement parsing instead of naive semicolon splitting
const fs = require('fs');
const path = require('path');

const ACCOUNT_ID = '080a62305eb19094886a60690a57d2ea';
const DB_ID = 'c962d07b-ddd9-430d-85fa-0bb6d5322ab2';
const TOKEN = 'cfoat_Hde1AlUjPmBnJwjJN0GQf9BkSjLi5ysMkCddv1GtS_4.B0jlzAKN0ESenZdWOCjYYarjvDGT2hmaumYnKezXtR4';

async function executeSql(sql) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${TOKEN}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ sql }),
    }
  );
  const data = await res.json();
  if (!data.success) {
    throw new Error(JSON.stringify(data.errors));
  }
  return data;
}

/**
 * Parse SQL file into individual statements, respecting quoted strings.
 * Splits on semicolons that are NOT inside single-quoted strings.
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

    if (ch === "'") {
      inString = true;
      current += ch;
      i++;
      continue;
    }

    if (ch === '-' && i + 1 < sql.length && sql[i + 1] === '-') {
      // Line comment - skip until newline
      while (i < sql.length && sql[i] !== '\n') {
        i++;
      }
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

  // Last statement
  const trimmed = current.trim();
  if (trimmed.length > 0) {
    statements.push(trimmed);
  }

  return statements;
}

async function main() {
  const sqlFile = path.join(__dirname, '..', 'migrations', '0003_seed_files.sql');
  const sql = fs.readFileSync(sqlFile, 'utf-8');

  const statements = parseSqlStatements(sql);
  console.log(`Found ${statements.length} SQL statements to execute`);

  let successCount = 0;
  let failCount = 0;

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i];
    try {
      await executeSql(stmt);
      successCount++;
      if ((i + 1) % 10 === 0) {
        console.log(`Progress: ${i + 1}/${statements.length} (${successCount} ok, ${failCount} failed)`);
      }
    } catch (err) {
      failCount++;
      console.error(`Error #${failCount} on statement ${i + 1}: ${stmt.substring(0, 100)}...`);
      console.error(`  ${err.message}`);
    }
  }

  console.log(`\nDone: ${successCount} succeeded, ${failCount} failed out of ${statements.length}`);

  // Verify
  try {
    const filesResult = await executeSql('SELECT count(*) as cnt FROM files');
    console.log(`Files: ${filesResult.result[0].results[0].cnt}`);

    const tagsResult = await executeSql('SELECT count(*) as cnt FROM tags');
    console.log(`Tags: ${tagsResult.result[0].results[0].cnt}`);

    const sourcesResult = await executeSql('SELECT count(*) as cnt FROM public_sources');
    console.log(`Public sources: ${sourcesResult.result[0].results[0].cnt}`);

    const versionsResult = await executeSql('SELECT count(*) as cnt FROM file_versions');
    console.log(`File versions: ${versionsResult.result[0].results[0].cnt}`);

    const deploysResult = await executeSql('SELECT count(*) as cnt FROM deployments');
    console.log(`Deployments: ${deploysResult.result[0].results[0].cnt}`);
  } catch (err) {
    console.error('Verification failed:', err.message);
  }
}

main().catch(console.error);
