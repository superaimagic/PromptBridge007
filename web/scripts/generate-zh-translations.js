/**
 * Generate Chinese translation SQL for all English prompts in the D1 database.
 * Reads files from D1 via wrangler, produces 0005_zh_*.sql migration files.
 *
 * Usage:  node scripts/gen-zh.js
 * Output: web/migrations/0005_zh_*.sql
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const WEB_DIR = path.join(__dirname, '..');
const MIGRATIONS_DIR = path.join(WEB_DIR, 'migrations');
const TMP_DIR = path.join(WEB_DIR, 'tmp');
const DB_NAME = 'promptbridge007';
const PROJECT_ID = 'default-project';
const MAX_CONTENT_CHARS = 380000;

const CATEGORY_ZH_MAP = {
  anthropic: 'Anthropic', openai: 'OpenAI', google: 'Google',
  microsoft: 'Microsoft', meta: 'Meta', xai: 'xAI',
  mistral: 'Mistral', perplexity: 'Perplexity', notion: 'Notion',
  qwen: '\u901A\u4E49\u5343\u95EE', cursor: 'Cursor', misc: '\u5176\u4ED6', seed: '\u79CD\u5B50',
};

const CATEGORY_TOOL_MAP = {
  anthropic: { tool: 'claude', domain: 'ai-assistant' },
  openai: { tool: 'chatgpt', domain: 'ai-assistant' },
  google: { tool: 'gemini', domain: 'ai-assistant' },
  microsoft: { tool: 'copilot', domain: 'ai-assistant' },
  meta: { tool: 'meta-ai', domain: 'ai-assistant' },
  xai: { tool: 'grok', domain: 'ai-assistant' },
  mistral: { tool: 'mistral', domain: 'ai-assistant' },
  perplexity: { tool: 'perplexity', domain: 'ai-assistant' },
  notion: { tool: 'notion-ai', domain: 'ai-assistant' },
  qwen: { tool: 'qwen', domain: 'ai-assistant' },
  cursor: { tool: 'cursor', domain: 'ai-assistant' },
  misc: { tool: 'other', domain: 'ai-assistant' },
  seed: { tool: 'other', domain: 'ai-assistant' },
};

const WORD_ZH = {
  'Fewer Permission Prompts': '\u51CF\u5C11\u6743\u9650\u63D0\u793A',
  'Graceful Degradation': '\u4F18\u96C5\u964D\u7EA7',
  'Load Balancing': '\u8D1F\u8F7D\u5747\u8861',
  'Fault Tolerance': '\u5BB9\u9519',
  'Circuit Breaker': '\u7194\u65AD\u5668',
  'Rate Limiting': '\u9650\u6D41',
  'Flow Control': '\u6D41\u91CF\u63A7\u5236',
  'Best Practice': '\u6700\u4F73\u5B9E\u8DF5',
  'Bug Fix': '\u7F3A\u9677\u4FEE\u590D',
  'Hotfix': '\u70ED\u4FEE\u590D',
  'Coding Agent': '\u7F16\u7A0B\u4EE3\u7406',
  'Deep Research': '\u6DF1\u5EA6\u7814\u7A76',
  'System Prompt': '\u7CFB\u7EDF\u63D0\u793A\u8BCD',
  'New Personality': '\u65B0\u4EBA\u683C',
  'Near Real-time': '\u51C6\u5B9E\u65F6',
  'Real-time': '\u5B9E\u65F6',
  'Personality': '\u4EBA\u683C',
  'Reminders': '\u63D0\u9192',
  'Keybindings': '\u5FEB\u6377\u952E',
  'Compact': '\u7CBE\u7B80',
  'Review': '\u5BA1\u67E5',
  'Official': '\u5B98\u65B9',
  'Debug': '\u8C03\u8BD5',
  'Init': '\u521D\u59CB\u5316',
  'Batch': '\u6279\u91CF\u5904\u7406',
  'Skill': '\u6280\u80FD',
  'Chat': '\u804A\u5929',
  'Canvas': '\u753B\u5E03',
  'Search': '\u641C\u7D22',
  'Reasoning': '\u63A8\u7406',
  'Analysis': '\u5206\u6790',
  'Image': '\u56FE\u50CF',
  'Generation': '\u751F\u6210',
  'Vision': '\u89C6\u89C9',
  'Safety': '\u5B89\u5168',
  'Instructions': '\u6307\u4EE4',
  'Guidelines': '\u51C6\u5219',
  'Rules': '\u89C4\u5219',
  'Behavior': '\u884C\u4E3A',
  'Response': '\u54CD\u5E94',
  'Format': '\u683C\u5F0F',
  'Tool': '\u5DE5\u5177',
  'Agent': '\u4EE3\u7406',
  'Assistant': '\u52A9\u624B',
  'Creative': '\u521B\u610F',
  'Writing': '\u5199\u4F5C',
  'Browsing': '\u6D4F\u89C8',
  'Memory': '\u8BB0\u5FC6',
  'Voice': '\u8BED\u97F3',
  'Desktop': '\u684C\u9762',
  'Mobile': '\u79FB\u52A8',
  'Web': '\u7F51\u9875',
  'App': '\u5E94\u7528',
  'Plugin': '\u63D2\u4EF6',
  'Extension': '\u6269\u5C55',
  'Integration': '\u96C6\u6210',
  'Configuration': '\u914D\u7F6E',
  'Settings': '\u8BBE\u7F6E',
  'Custom': '\u81EA\u5B9A\u4E49',
  'Default': '\u9ED8\u8BA4',
  'Advanced': '\u9AD8\u7EA7',
  'Basic': '\u57FA\u7840',
  'General': '\u901A\u7528',
  'Specific': '\u7279\u5B9A',
  'Internal': '\u5185\u90E8',
  'External': '\u5916\u90E8',
  'Core': '\u6838\u5FC3',
  'Main': '\u4E3B\u8981',
  'Primary': '\u9996\u8981',
  'Secondary': '\u6B21\u8981',
  'Additional': '\u9644\u52A0',
  'Supplementary': '\u8865\u5145',
  'Enhanced': '\u589E\u5F3A',
  'Improved': '\u6539\u8FDB',
  'Updated': '\u66F4\u65B0',
  'Latest': '\u6700\u65B0',
  'Version': '\u7248\u672C',
  'Release': '\u53D1\u5E03',
  'Preview': '\u9884\u89C8',
  'Beta': '\u6D4B\u8BD5\u7248',
  'Alpha': '\u5185\u6D4B\u7248',
  'Experimental': '\u5B9E\u9A8C\u6027',
  'Stable': '\u7A33\u5B9A\u7248',
  'Production': '\u751F\u4EA7\u73AF\u5883',
  'Development': '\u5F00\u53D1',
  'Test': '\u6D4B\u8BD5',
  'Demo': '\u6F14\u793A',
  'Example': '\u793A\u4F8B',
  'Template': '\u6A21\u677F',
  'Tutorial': '\u6559\u7A0B',
  'Guide': '\u6307\u5357',
  'Documentation': '\u6587\u6863',
  'Reference': '\u53C2\u8003',
  'Overview': '\u6982\u89C8',
  'Summary': '\u6458\u8981',
  'Introduction': '\u7B80\u4ECB',
  'Description': '\u63CF\u8FF0',
  'Explanation': '\u8BF4\u660E',
  'Definition': '\u5B9A\u4E49',
  'Concept': '\u6982\u5FF5',
  'Principle': '\u539F\u7406',
  'Method': '\u65B9\u6CD5',
  'Process': '\u6D41\u7A0B',
  'Workflow': '\u5DE5\u4F5C\u6D41',
  'Pipeline': '\u7BA1\u9053',
  'Architecture': '\u67B6\u6784',
  'Design': '\u8BBE\u8BA1',
  'Pattern': '\u6A21\u5F0F',
  'Strategy': '\u7B56\u7565',
  'Approach': '\u65B9\u6CD5',
  'Solution': '\u89E3\u51B3\u65B9\u6848',
  'Implementation': '\u5B9E\u73B0',
  'Feature': '\u529F\u80FD',
  'Function': '\u51FD\u6570',
  'Module': '\u6A21\u5757',
  'Component': '\u7EC4\u4EF6',
  'System': '\u7CFB\u7EDF',
  'Framework': '\u6846\u67B6',
  'Library': '\u5E93',
  'Package': '\u5305',
  'Service': '\u670D\u52A1',
  'Platform': '\u5E73\u53F0',
  'Environment': '\u73AF\u5883',
  'Infrastructure': '\u57FA\u7840\u8BBE\u65BD',
  'Deployment': '\u90E8\u7F72',
  'Operation': '\u64CD\u4F5C',
  'Management': '\u7BA1\u7406',
  'Administration': '\u7BA1\u7406',
  'Monitoring': '\u76D1\u63A7',
  'Logging': '\u65E5\u5FD7',
  'Reporting': '\u62A5\u544A',
  'Analytics': '\u5206\u6790',
  'Metrics': '\u6307\u6807',
  'Performance': '\u6027\u80FD',
  'Optimization': '\u4F18\u5316',
  'Scaling': '\u6269\u5C55',
  'Privacy': '\u9690\u79C1',
  'Compliance': '\u5408\u89C4',
  'Governance': '\u6CBB\u7406',
  'Policy': '\u7B56\u7565',
  'Standard': '\u6807\u51C6',
  'Recommendation': '\u5EFA\u8BAE',
  'Requirement': '\u9700\u6C42',
  'Constraint': '\u7EA6\u675F',
  'Limitation': '\u9650\u5236',
  'Capability': '\u80FD\u529B',
  'Functionality': '\u529F\u80FD\u6027',
  'Compatibility': '\u517C\u5BB9\u6027',
  'Interoperability': '\u4E92\u64CD\u4F5C\u6027',
  'Reliability': '\u53EF\u9760\u6027',
  'Availability': '\u53EF\u7528\u6027',
  'Scalability': '\u53EF\u6269\u5C55\u6027',
  'Maintainability': '\u53EF\u7EF4\u62A4\u6027',
  'Extensibility': '\u53EF\u6269\u5C55\u6027',
  'Portability': '\u53EF\u79FB\u690D\u6027',
  'Usability': '\u6613\u7528\u6027',
  'Accessibility': '\u53EF\u8BBF\u95EE\u6027',
  'Internationalization': '\u56FD\u9645\u5316',
  'Localization': '\u672C\u5730\u5316',
  'Customization': '\u5B9A\u5236\u5316',
  'Personalization': '\u4E2A\u6027\u5316',
  'Notification': '\u901A\u77E5',
  'Alert': '\u544A\u8B66',
  'Warning': '\u8B66\u544A',
  'Error': '\u9519\u8BEF',
  'Exception': '\u5F02\u5E38',
  'Failure': '\u6545\u969C',
  'Recovery': '\u6062\u590D',
  'Backup': '\u5907\u4EFD',
  'Restore': '\u8FD8\u539F',
  'Migration': '\u8FC1\u79FB',
  'Upgrade': '\u5347\u7EA7',
  'Downgrade': '\u964D\u7EA7',
  'Rollback': '\u56DE\u6EDA',
  'Patch': '\u8865\u4E01',
  'Enhancement': '\u589E\u5F3A',
  'Improvement': '\u6539\u8FDB',
  'Refactoring': '\u91CD\u6784',
  'Restructuring': '\u91CD\u7EC4',
  'Reorganization': '\u91CD\u65B0\u7EC4\u7EC7',
  'Simplification': '\u7B80\u5316',
  'Streamlining': '\u7CBE\u7B80',
  'Automation': '\u81EA\u52A8\u5316',
  'Orchestration': '\u7F16\u6392',
  'Coordination': '\u534F\u8C03',
  'Collaboration': '\u534F\u4F5C',
  'Communication': '\u901A\u4FE1',
  'Synchronization': '\u540C\u6B65',
  'Replication': '\u590D\u5236',
  'Distribution': '\u5206\u53D1',
  'Publication': '\u53D1\u5E03',
  'Subscription': '\u8BA2\u9605',
  'Acknowledgment': '\u786E\u8BA4',
  'Confirmation': '\u786E\u8BA4',
  'Validation': '\u9A8C\u8BC1',
  'Verification': '\u6838\u5B9E',
  'Authentication': '\u8BA4\u8BC1',
  'Authorization': '\u6388\u6743',
  'Permission': '\u6743\u9650',
  'Access': '\u8BBF\u95EE',
  'Control': '\u63A7\u5236',
  'Setup': '\u8BBE\u7F6E',
  'Installation': '\u5B89\u88C5',
  'Uninstallation': '\u5378\u8F7D',
  'Initialization': '\u521D\u59CB\u5316',
  'Termination': '\u7EC8\u6B62',
  'Suspension': '\u6682\u505C',
  'Resumption': '\u6062\u590D',
  'Execution': '\u6267\u884C',
  'Processing': '\u5904\u7406',
  'Handling': '\u5904\u7406',
  'Manipulation': '\u64CD\u4F5C',
  'Transformation': '\u8F6C\u6362',
  'Conversion': '\u8F6C\u6362',
  'Translation': '\u7FFB\u8BD1',
  'Interpretation': '\u89E3\u8BFB',
  'Evaluation': '\u8BC4\u4F30',
  'Assessment': '\u8BC4\u5B9A',
  'Estimation': '\u4F30\u7B97',
  'Calculation': '\u8BA1\u7B97',
  'Computation': '\u8BA1\u7B97',
  'Measurement': '\u6D4B\u91CF',
  'Detection': '\u68C0\u6D4B',
  'Identification': '\u8BC6\u522B',
  'Recognition': '\u8BC6\u522B',
  'Classification': '\u5206\u7C7B',
  'Categorization': '\u5F52\u7C7B',
  'Grouping': '\u5206\u7EC4',
  'Sorting': '\u6392\u5E8F',
  'Filtering': '\u8FC7\u6EE4',
  'Selection': '\u9009\u62E9',
  'Extraction': '\u63D0\u53D6',
  'Retrieval': '\u68C0\u7D22',
  'Storage': '\u5B58\u50A8',
  'Persistence': '\u6301\u4E45\u5316',
  'Caching': '\u7F13\u5B58',
  'Buffering': '\u7F13\u51B2',
  'Queueing': '\u6392\u961F',
  'Scheduling': '\u8C03\u5EA6',
  'Prioritization': '\u4F18\u5148\u7EA7\u6392\u5E8F',
  'Allocation': '\u5206\u914D',
  'Assignment': '\u6307\u6D3E',
  'Delegation': '\u59D4\u6D3E',
  'Routing': '\u8DEF\u7531',
  'Failover': '\u6545\u969C\u8F6C\u79FB',
  'Redundancy': '\u5197\u4F59',
  'Resilience': '\u5F39\u6027',
  'Robustness': '\u5065\u58EE\u6027',
  'Throttling': '\u8282\u6D41',
  'Backpressure': '\u80CC\u538B',
  'Concurrency': '\u5E76\u53D1',
  'Parallelism': '\u5E76\u884C',
  'Asynchronous': '\u5F02\u6B65',
  'Synchronous': '\u540C\u6B65',
  'Stream': '\u6D41',
  'Event': '\u4E8B\u4EF6',
  'Message': '\u6D88\u606F',
  'Request': '\u8BF7\u6C42',
  'Reply': '\u56DE\u590D',
  'Acknowledge': '\u786E\u8BA4',
  'Reject': '\u62D2\u7EDD',
  'Accept': '\u63A5\u53D7',
  'Approve': '\u6279\u51C6',
  'Deny': '\u62D2\u7EDD',
  'Allow': '\u5141\u8BB8',
  'Block': '\u963B\u6B62',
  'Enable': '\u542F\u7528',
  'Disable': '\u7981\u7528',
  'Activate': '\u6FC0\u6D3B',
  'Deactivate': '\u505C\u7528',
  'Start': '\u542F\u52A8',
  'Stop': '\u505C\u6B62',
  'Pause': '\u6682\u505C',
  'Resume': '\u7EE7\u7EED',
  'Restart': '\u91CD\u542F',
  'Reset': '\u91CD\u7F6E',
  'Refresh': '\u5237\u65B0',
  'Reload': '\u91CD\u65B0\u52A0\u8F7D',
  'Sync': '\u540C\u6B65',
  'Async': '\u5F02\u6B65',
  'Code': '\u4EE3\u7801',
  'API': 'API',
};

const SORTED_TRANSLATION_KEYS = Object.keys(WORD_ZH).sort((a, b) => b.length - a.length);

function generateId() {
  return 'spl-zh-' + crypto.randomBytes(4).toString('hex');
}

function escapeSql(str) {
  if (str === null || str === undefined) return 'NULL';
  return String(str).replace(/'/g, "''");
}

function truncateContent(content) {
  if (content.length <= MAX_CONTENT_CHARS) return content;
  return content.substring(0, MAX_CONTENT_CHARS) + '\n\n[... truncated ...]';
}

function computeContentHash(content) {
  return crypto.createHash('sha256').update(content).digest('hex');
}

function parseWranglerOutput(output) {
  const lines = output.split('\n');
  let jsonStart = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].trim() === '[') { jsonStart = i; break; }
  }
  if (jsonStart === -1) return [];
  const jsonStr = lines.slice(jsonStart).join('\n');
  try {
    const parsed = JSON.parse(jsonStr);
    if (Array.isArray(parsed) && parsed.length > 0 && parsed[0].results) return parsed[0].results;
    return [];
  } catch (e) { return []; }
}

function queryD1(sql) {
  try {
    const escapedSql = sql.replace(/"/g, '\\"');
    const result = execSync(
      'npx wrangler d1 execute ' + DB_NAME + ' --remote --command="' + escapedSql + '"',
      { cwd: WEB_DIR, encoding: 'utf-8', timeout: 120000, maxBuffer: 100 * 1024 * 1024, stdio: ['pipe', 'pipe', 'pipe'] }
    );
    return parseWranglerOutput(result);
  } catch (err) { console.error('Query failed: ' + err.message.substring(0, 200)); return []; }
}

function escapeRegex(str) { return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); }

function translateWords(text) {
  let result = text; let changed = false;
  for (const en of SORTED_TRANSLATION_KEYS) {
    const zh = WORD_ZH[en];
    const regex = new RegExp('\\b' + escapeRegex(en) + '\\b', 'gi');
    const newResult = result.replace(regex, zh);
    if (newResult !== result) { changed = true; result = newResult; }
  }
  if (!changed) return text + '(\u4E2D\u6587\u7248)';
  return result;
}

function translateName(name) {
  const match = name.match(/^\[(.+?)\]\s*(.+)$/);
  if (!match) return translateWords(name);
  const category = match[1]; const rest = match[2];
  const categoryZh = CATEGORY_ZH_MAP[category.toLowerCase()] || category;
  const restZh = translateWords(rest);
  return '[' + categoryZh + '] ' + restZh;
}

function generateChineseSummary(name, content, category) {
  const categoryZh = CATEGORY_ZH_MAP[category] || category;
  const headers = []; const headerRegex = /^#{1,3}\s+(.+)$/gm; let match;
  while ((match = headerRegex.exec(content)) !== null) {
    const h = match[1].trim().replace(/[*_`#]/g, '').trim();
    if (h && h.length < 80 && headers.length < 6) headers.push(h);
  }
  const tools = new Set(); const toolRegex = /`([a-z_][a-z0-9_]{2,})`/gi;
  while ((match = toolRegex.exec(content)) !== null) {
    const t = match[1].toLowerCase();
    if (!['the','and','for','you','are','not','use','can','all','but','has','may'].includes(t)) tools.add(t);
  }
  const lowerContent = content.toLowerCase();
  const safetyTerms = ['safety','harmful','dangerous','refuse','inappropriate','policy','restriction','guardrail','content policy','ethical'];
  const hasSafety = safetyTerms.some(function(t) { return lowerContent.includes(t); });
  const bullets = [];
  if (headers.length > 0) bullets.push('\u4E3B\u8981\u6DB5\u76D6\uFF1A' + headers.slice(0, 4).join('\u3001'));
  if (tools.size > 0) bullets.push('\u6D89\u53CA\u5DE5\u5177/\u529F\u80FD\uFF1A' + Array.from(tools).slice(0, 5).join('\u3001'));
  if (hasSafety) bullets.push('\u5305\u542B\u5B89\u5168\u4E0E\u884C\u4E3A\u7EA6\u675F\u6307\u5F15');
  if (lowerContent.includes('coding') || lowerContent.includes('code generation') || lowerContent.includes('software engineer') || lowerContent.includes('programming')) bullets.push('\u9762\u5411\u7F16\u7A0B\u4E0E\u8F6F\u4EF6\u5F00\u53D1\u573A\u666F');
  if (bullets.length === 0) bullets.push('AI \u7CFB\u7EDF\u63D0\u793A\u8BCD\uFF0C\u5B9A\u4E49\u6A21\u578B\u884C\u4E3A\u4E0E\u54CD\u5E94\u89C4\u8303');
  return ['---', '## \u4E2D\u6587\u6458\u8981', '', '\u672C\u63D0\u793A\u8BCD\u4E3A ' + categoryZh + ' \u7684\u7CFB\u7EDF\u63D0\u793A\u8BCD\uFF0C\u4E3B\u8981\u529F\u80FD\u5305\u62EC\uFF1A'].concat(bullets.map(function(b) { return '- ' + b; })).concat(['', '\u4EE5\u4E0B\u662F\u82F1\u6587\u539F\u6587\uFF1A', '', '---', '']).join('\n');
}

function buildFileInsert(id, slug, name, content, contentHash, originalFile) {
  var fmt = originalFile.format || 'markdown';
  var srcType = originalFile.source_type || 'public';
  var repoName = originalFile.repo_name || 'system_prompts_leaks';
  var repoUrl = originalFile.repo_url || '';
  var repoLic = originalFile.repo_license || 'MIT';
  var author = originalFile.author;
  var authorUrl = originalFile.author_url;
  var filePath = originalFile.file_path || '';
  var commitHash = originalFile.commit_hash || 'latest';
  var lic = originalFile.license || 'MIT';
  var licUrl = originalFile.license_url || 'https://opensource.org/licenses/MIT';
  return "INSERT OR IGNORE INTO files (id, slug, name, content, content_hash, format, project_id, source_type, repo_name, repo_url, repo_license, author, author_url, file_path, commit_hash, fetched_at, license, license_url, version, install_count, rating, created_at, updated_at, deleted_at) VALUES (" +
    "'" + id + "', '" + escapeSql(slug) + "', '" + escapeSql(name) + "', '" + escapeSql(content) + "', '" + contentHash + "', " +
    "'" + fmt + "', '" + PROJECT_ID + "', '" + escapeSql(srcType) + "', '" + escapeSql(repoName) + "', '" + escapeSql(repoUrl) + "', '" + escapeSql(repoLic) + "', " +
    (author ? "'" + escapeSql(author) + "'" : 'NULL') + ", " + (authorUrl ? "'" + escapeSql(authorUrl) + "'" : 'NULL') + ", " +
    "'" + escapeSql(filePath) + "', '" + commitHash + "', datetime('now'), '" + escapeSql(lic) + "', '" + escapeSql(licUrl) + "', " +
    "1, 0, 0, datetime('now'), datetime('now'), NULL);";
}

function buildTagInserts(fileId, originalTags, category) {
  var catInfo = CATEGORY_TOOL_MAP[category] || { tool: 'other', domain: 'ai-assistant' };
  var tagEntries = [
    { dimension: 'tool', value: catInfo.tool, confidence: 0.95 },
    { dimension: 'role', value: 'system-prompt', confidence: 0.90 },
    { dimension: 'domain', value: catInfo.domain, confidence: 0.85 },
    { dimension: 'language', value: 'zh', confidence: 0.95 },
    { dimension: 'quality', value: 'standard', confidence: 0.80 },
    { dimension: 'source_type', value: 'zh-translation', confidence: 0.95 },
  ];
  if (originalTags) {
    for (var i = 0; i < originalTags.length; i++) {
      var tag = originalTags[i];
      if (tag.dimension === 'version') tagEntries.push({ dimension: 'version', value: tag.value, confidence: 0.90 });
      if (tag.dimension === 'sub_category') tagEntries.push({ dimension: 'sub_category', value: tag.value, confidence: 0.85 });
    }
  }
  return tagEntries.map(function(t) {
    var tagId = generateId();
    return "INSERT INTO tags (id, file_id, dimension, value, confidence, created_at) VALUES ('" + tagId + "', '" + fileId + "', '" + t.dimension + "', '" + escapeSql(t.value) + "', " + t.confidence + ", datetime('now'));";
  });
}

function buildVersionInsert(fileId, content, contentHash) {
  var versionId = generateId();
  return "INSERT INTO file_versions (id, file_id, version, content, content_hash, change_summary, created_at) VALUES ('" + versionId + "', '" + fileId + "', 1, '" + escapeSql(content) + "', '" + contentHash + "', '\u4E2D\u6587\u7FFB\u8BD1\u7248\u672C - \u81EA\u52A8\u751F\u6210', datetime('now'));";
}

async function main() {
  console.log('=== Generating Chinese Translation SQL ===');
  console.log('Database: ' + DB_NAME);
  console.log('Time: ' + new Date().toISOString() + '\n');
  if (!fs.existsSync(TMP_DIR)) fs.mkdirSync(TMP_DIR, { recursive: true });

  console.log('Step 1: Querying categories from D1...');
  var categories = queryD1("SELECT DISTINCT substr(slug, 1, instr(slug, '/') - 1) as category FROM files WHERE slug LIKE '%/%' AND slug NOT LIKE '%-zh' ORDER BY category");
  var categoryList = categories.map(function(c) { return c.category; });
  console.log('  Found ' + categoryList.length + ' categories: ' + categoryList.join(', ') + '\n');

  console.log('Step 2: Querying files from D1 by category...');
  var allFiles = []; var allTags = {};
  for (var ci = 0; ci < categoryList.length; ci++) {
    var cat = categoryList[ci];
    console.log('  Querying ' + cat + '...');
    var files = queryD1("SELECT id, slug, name, content, content_hash, format, project_id, source_type, repo_name, repo_url, repo_license, author, author_url, file_path, commit_hash, fetched_at, license, license_url, version, install_count, rating FROM files WHERE slug LIKE '" + cat + "/%' AND slug NOT LIKE '%-zh'");
    console.log('    Found ' + files.length + ' files');
    if (files.length > 0) {
      var fileIds = files.map(function(f) { return "'" + f.id + "'"; }).join(',');
      var tags = queryD1('SELECT id, file_id, dimension, value, confidence FROM tags WHERE file_id IN (' + fileIds + ')');
      for (var ti = 0; ti < tags.length; ti++) { var tag = tags[ti]; if (!allTags[tag.file_id]) allTags[tag.file_id] = []; allTags[tag.file_id].push(tag); }
    }
    allFiles = allFiles.concat(files);
  }
  console.log('  Querying seed files (no category prefix)...');
  var seedFiles = queryD1("SELECT id, slug, name, content, content_hash, format, project_id, source_type, repo_name, repo_url, repo_license, author, author_url, file_path, commit_hash, fetched_at, license, license_url, version, install_count, rating FROM files WHERE slug NOT LIKE '%/%' AND slug NOT LIKE '%-zh'");
  console.log('    Found ' + seedFiles.length + ' seed files');
  if (seedFiles.length > 0) {
    var seedFileIds = seedFiles.map(function(f) { return "'" + f.id + "'"; }).join(',');
    var seedTags = queryD1('SELECT id, file_id, dimension, value, confidence FROM tags WHERE file_id IN (' + seedFileIds + ')');
    for (var sti = 0; sti < seedTags.length; sti++) { var stag = seedTags[sti]; if (!allTags[stag.file_id]) allTags[stag.file_id] = []; allTags[stag.file_id].push(stag); }
  }
  allFiles = allFiles.concat(seedFiles);
  console.log('  Total files: ' + allFiles.length + '\n');

  console.log('Step 3: Checking for existing Chinese translations...');
  var existingZhSlugs = new Set();
  var zhFiles = queryD1("SELECT slug FROM files WHERE slug LIKE '%-zh'");
  for (var zi = 0; zi < zhFiles.length; zi++) existingZhSlugs.add(zhFiles[zi].slug);
  console.log('  Found ' + existingZhSlugs.size + ' existing Chinese translations\n');

  console.log('Step 4: Generating Chinese translation SQL...');
  var byCategory = {};
  for (var fi = 0; fi < allFiles.length; fi++) {
    var file = allFiles[fi];
    var category = file.slug.includes('/') ? file.slug.split('/')[0] : 'seed';
    var zhSlug = file.slug + '-zh';
    if (existingZhSlugs.has(zhSlug)) { console.log('  SKIP: ' + file.slug + ' (zh translation already exists)'); continue; }
    if (file.content) {
      var cjk = (file.content.match(/[\u4e00-\u9fff\u3040-\u309f\u30a0-\u30ff\uac00-\ud7af]/g) || []).length;
      if (cjk / file.content.length > 0.15) { console.log('  SKIP: ' + file.slug + ' (already in CJK language)'); continue; }
    }
    if (!byCategory[category]) byCategory[category] = [];
    byCategory[category].push(file);
  }

  var categoryOrder = ['anthropic','openai','google','microsoft','meta','xai','mistral','perplexity','notion','qwen','cursor','misc','seed'];
  var summary = {}; var totalCount = 0; var totalSqlSize = 0;
  for (var oi = 0; oi < categoryOrder.length; oi++) {
    var ocat = categoryOrder[oi]; var items = byCategory[ocat];
    if (!items || items.length === 0) { summary[ocat] = 0; continue; }
    var lines = [];
    lines.push('-- Migration: 0005_zh_' + ocat);
    lines.push('-- PromptBridge007: Chinese translations - ' + ocat);
    lines.push('-- Generated: ' + new Date().toISOString());
    lines.push('-- File count: ' + items.length);
    lines.push('');
    for (var ii = 0; ii < items.length; ii++) {
      var item = items[ii]; var originalContent = item.content || '';
      if (!originalContent.trim()) continue;
      var newId = generateId(); var newSlug = item.slug + '-zh';
      var zhName = translateName(item.name);
      var zhSummary = generateChineseSummary(item.name, originalContent, ocat);
      var newContent = truncateContent(zhSummary + originalContent);
      var newContentHash = computeContentHash(newContent);
      var originalTags = allTags[item.id] || [];
      lines.push('-- ' + item.name + ' -> ' + zhName);
      lines.push(buildFileInsert(newId, newSlug, zhName, newContent, newContentHash, item));
      var tagLines = buildTagInserts(newId, originalTags, ocat);
      for (var tli = 0; tli < tagLines.length; tli++) lines.push(tagLines[tli]);
      lines.push(buildVersionInsert(newId, newContent, newContentHash));
      lines.push(''); totalCount++;
    }
    var sql = lines.join('\n') + '\n';
    var outPath = path.join(MIGRATIONS_DIR, '0005_zh_' + ocat + '.sql');
    fs.writeFileSync(outPath, sql, 'utf-8');
    var size = Buffer.byteLength(sql, 'utf-8');
    summary[ocat] = items.length; totalSqlSize += size;
    console.log('  ' + ocat + ': ' + items.length + ' files -> ' + outPath + ' (' + (size / 1024).toFixed(1) + ' KB)');
  }
  console.log('\n=== Generation Summary ===');
  for (var si = 0; si < categoryOrder.length; si++) { if (summary[categoryOrder[si]]) console.log('  ' + categoryOrder[si] + ': ' + summary[categoryOrder[si]] + ' files'); }
  console.log('  Total translated files: ' + totalCount);
  console.log('  Total SQL size: ' + (totalSqlSize / 1024 / 1024).toFixed(2) + ' MB');
  console.log('\nDone!');
}

main().catch(function(err) { console.error('Fatal error:', err); process.exit(1); });
