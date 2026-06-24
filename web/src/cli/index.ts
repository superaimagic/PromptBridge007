#!/usr/bin/env node

import { Command } from 'commander';
import { getDb, ensureInitialized } from '../lib/db';
import { files, tags } from '../lib/db/schema';
import { eq, like, or, desc, isNull } from 'drizzle-orm';
import { scanEngine } from '../lib/core/ScanEngine';
import { deployEngine } from '../lib/core/DeployEngine';
import { syncEngine } from '../lib/core/SyncEngine';
import { formatMatrix } from '../lib/core/FormatMatrix';
import { publicSyncEngine } from '../lib/core/PublicSyncEngine';
import { toolRegistry } from '../lib/core/ToolRegistry';

const program = new Command();

program
  .name('pb007')
  .description('PromptBridge007 - Cross-platform AI prompt management')
  .version('0.1.0');

// ─── scan ──────────────────────────────────────────────────────────────────

program
  .command('scan')
  .description('Scan environment for AI tools and their prompt files')
  .option('-t, --tool <toolId>', 'Scan specific tool only')
  .action(async (options) => {
    await ensureInitialized();
    console.log('🔍 Scanning environment...\n');

    const toolIds = options.tool ? [options.tool] : undefined;
    const result = await scanEngine.scanEnvironment(toolIds);

    console.log(`Found ${result.detectedTools}/${result.totalTools} tools\n`);
    for (const r of result.results) {
      const icon = r.detected ? '✅' : '❌';
      console.log(`  ${icon} ${r.toolName}: ${r.filesFound} files (${r.filesImported} imported)`);
    }

    process.exit(0);
  });

// ─── list ──────────────────────────────────────────────────────────────────

program
  .command('list')
  .description('List all prompts in the library')
  .option('-t, --tool <toolId>', 'Filter by tool tag')
  .option('-s, --source <type>', 'Filter by source type')
  .option('--limit <n>', 'Max results', '20')
  .action(async (options) => {
    await ensureInitialized();

    const rows = await getDb().select({
      id: files.id,
      name: files.name,
      license: files.license,
      sourceType: files.sourceType,
      rating: files.rating,
    }).from(files).where(isNull(files.deletedAt))
      .limit(parseInt(options.limit))
      .orderBy(desc(files.rating));

    if (rows.length === 0) {
      console.log('No prompts found.');
    } else {
      console.log(`\nFound ${rows.length} prompts:\n`);
      for (const r of rows) {
        console.log(`  ${r.name} [${r.sourceType}] (${r.license})`);
      }
    }

    process.exit(0);
  });

// ─── deploy ────────────────────────────────────────────────────────────────

program
  .command('deploy <fileId> <toolId>')
  .description('Deploy a prompt to a target AI tool')
  .option('-m, --mode <mode>', 'Deploy mode: original|customized|incremental', 'original')
  .option('-c, --content <content>', 'Custom content for customized/incremental mode')
  .action(async (fileId, toolId, options) => {
    await ensureInitialized();
    console.log(`🚀 Deploying ${fileId} to ${toolId}...\n`);

    const result = await deployEngine.deploy({
      fileId,
      toolId,
      mode: options.mode,
      customContent: options.content,
    });

    if (result.status === 'success') {
      console.log(`✅ Deployed to: ${result.targetPath}`);
    } else {
      console.error(`❌ Deploy failed: ${result.errorMessage}`);
    }

    process.exit(result.status === 'success' ? 0 : 1);
  });

// ─── sync ──────────────────────────────────────────────────────────────────

program
  .command('sync <toolId>')
  .description('Sync prompts with a tool directory')
  .option('-d, --direction <dir>', 'Direction: to_tool|from_tool', 'to_tool')
  .action(async (toolId, options) => {
    await ensureInitialized();
    console.log(`🔄 Syncing ${toolId} (${options.direction})...\n`);

    const result = await syncEngine.sync(toolId, options.direction);

    console.log(`Status: ${result.status}`);
    console.log(`Files synced: ${result.filesSynced}`);

    if (result.conflicts.length > 0) {
      console.log('\n⚠️  Conflicts:');
      for (const c of result.conflicts) {
        console.log(`  ${c.filePath}`);
      }
    }

    process.exit(0);
  });

// ─── search ────────────────────────────────────────────────────────────────

program
  .command('search <query>')
  .description('Search prompts by keyword')
  .option('--limit <n>', 'Max results', '10')
  .action(async (query, options) => {
    await ensureInitialized();

    const rows = await getDb().select({
      id: files.id,
      name: files.name,
      license: files.license,
    }).from(files).where(
      or(like(files.name, `%${query}%`), like(files.content, `%${query}%`))
    ).limit(parseInt(options.limit));

    if (rows.length === 0) {
      console.log('No results found.');
    } else {
      for (const r of rows) {
        console.log(`  ${r.name} (${r.id}) [${r.license}]`);
      }
    }

    process.exit(0);
  });

// ─── convert ───────────────────────────────────────────────────────────────

program
  .command('convert <fileId> <format>')
  .description('Convert a prompt to a target format')
  .action(async (fileId, format) => {
    await ensureInitialized();

    const rows = await getDb().select().from(files).where(eq(files.id, fileId)).limit(1);
    if (rows.length === 0) {
      console.error('File not found.');
      process.exit(1);
    }

    const file = rows[0];
    const pif = {
      name: file.name,
      content: file.content,
      slug: file.slug,
      license: file.license,
      sourceType: file.sourceType,
    };

    try {
      const converted = formatMatrix.toFormat(pif, format);
      console.log(converted);
    } catch (err) {
      console.error(`Conversion failed: ${err instanceof Error ? err.message : String(err)}`);
      process.exit(1);
    }

    process.exit(0);
  });

// ─── tools ─────────────────────────────────────────────────────────────────

program
  .command('tools')
  .description('List all supported AI tools')
  .action(() => {
    console.log('\nSupported AI Tools:\n');

    const international = toolRegistry.filter(t => t.category === 'international');
    const domestic = toolRegistry.filter(t => t.category === 'domestic');

    console.log('International:');
    for (const t of international) {
      console.log(`  ${t.displayName.padEnd(20)} ${t.id}`);
    }

    console.log('\nDomestic (China):');
    for (const t of domestic) {
      console.log(`  ${t.displayName.padEnd(20)} ${t.id}`);
    }

    process.exit(0);
  });

// ─── sync-public ───────────────────────────────────────────────────────────

program
  .command('sync-public <sourceId>')
  .description('Sync a public prompt repository')
  .action(async (sourceId) => {
    await ensureInitialized();
    console.log(`📥 Syncing public source ${sourceId}...\n`);

    const result = await publicSyncEngine.syncSource(sourceId);

    console.log(`Status: ${result.status}`);
    console.log(`Files: ${result.filesFound} found, ${result.filesImported} imported, ${result.filesUpdated} updated`);

    if (result.errors.length > 0) {
      console.log('\nErrors:');
      for (const e of result.errors) {
        console.log(`  ${e}`);
      }
    }

    process.exit(0);
  });

// Parse
program.parseAsync().catch((err) => {
  console.error(err.message);
  process.exit(1);
});
