// Check D1 database size and row counts
const ACCOUNT_ID = '080a62305eb19094886a60690a57d2ea';
const DB_ID = 'c962d07b-ddd9-430d-85fa-0bb6d5322ab2';
const TOKEN = 'cfoat_Hde1AlUjPmBnJwjJN0GQf9BkSjLi5ysMkCddv1GtS_4.B0jlzAKN0ESenZdWOCjYYarjvDGT2hmaumYnKezXtR4';

async function query(sql) {
  const res = await fetch(
    `https://api.cloudflare.com/client/v4/accounts/${ACCOUNT_ID}/d1/database/${DB_ID}/query`,
    {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ sql }),
    }
  );
  const data = await res.json();
  if (!data.success) throw new Error(JSON.stringify(data.errors));
  return data.result[0].results[0];
}

async function main() {
  const tables = ['files', 'tags', 'projects', 'tools', 'public_sources', 'file_versions', 'deployments'];
  let totalRows = 0;

  console.log('=== D1 Database Row Counts ===');
  for (const t of tables) {
    const r = await query(`SELECT COUNT(*) as cnt FROM ${t}`);
    console.log(`  ${t}: ${r.cnt} rows`);
    totalRows += r.cnt;
  }
  console.log(`  TOTAL: ${totalRows} rows`);

  // Check database size via page_count * page_size
  try {
    const pageSize = await query('PRAGMA page_size');
    const pageCount = await query('PRAGMA page_count');
    const sizeBytes = pageSize.page_size * pageCount.page_count;
    const sizeKB = (sizeBytes / 1024).toFixed(1);
    const sizeMB = (sizeBytes / 1024 / 1024).toFixed(2);
    console.log(`\n=== D1 Database Size ===`);
    console.log(`  Page size: ${pageSize.page_size} bytes`);
    console.log(`  Page count: ${pageCount.page_count}`);
    console.log(`  Total size: ${sizeKB} KB (${sizeMB} MB)`);
  } catch (e) {
    console.log(`\n  (Could not query PRAGMA: ${e.message})`);
  }

  // Cloudflare Free Tier Limits
  console.log('\n=== Cloudflare Free Tier Limits ===');
  console.log('  Workers:');
  console.log('    Requests: 100,000/day (current: ~low)');
  console.log('    CPU time: 10ms/invocation');
  console.log('  D1 Database:');
  console.log('    Storage: 5 GB (current: <1 MB)');
  console.log('    Rows read: 5,000,000/day');
  console.log('    Rows written: 100,000/day');
  console.log('  Pages/Workers Static Assets:');
  console.log('    Bandwidth: Unlimited');
  console.log('    Requests: 100,000/day (Workers)');
}

main().catch(console.error);
