# PromptMS Official AI Prompts Seed Data Generator
# Downloads prompt files from GitHub and generates MySQL INSERT SQL

$ErrorActionPreference = "Continue"
$OutputFile = Join-Path $PSScriptRoot "seed_official_prompts.sql"
$BaseUrl = "https://raw.githubusercontent.com/x1xhlol/system-prompts-and-models-of-ai-tools/main/"

# Define all prompts
$Prompts = @(
    @{ Dir="Cursor Prompts"; File="Agent Prompt 2.0.txt"; Title="Cursor Agent 2.0 系统提示词"; Desc="Cursor IDE Agent 模式的官方系统提示词，支持代码搜索、文件编辑、终端操作等工具调用"; CatId="c10000000005"; ModelConf='{"model":"gpt-4","provider":"openai","temperature":0.7}'; ModelTag="t10000000001"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Devin AI"; File="Prompt.txt"; Title="Devin AI 软件工程师提示词"; Desc="Devin AI 自主软件工程师的官方系统提示词，支持全流程代码开发与调试"; CatId="c10000000005"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Windsurf"; File="Prompt Wave 11.txt"; Title="Windsurf Cascade 提示词"; Desc="Windsurf IDE Cascade AI 编程助手的官方系统提示词，支持 AI Flow 范式协作编程"; CatId="c10000000005"; ModelConf='{"model":"gpt-4","provider":"openai","temperature":0.7}'; ModelTag="t10000000001"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Manus Agent Tools & Prompt"; File="Prompt.txt"; Title="Manus AI 助手提示词"; Desc="Manus AI 通用助手的官方系统提示词，支持浏览器操作、文件系统、Shell命令等多种工具"; CatId="c10000000001"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$true; IsCoding=$false }
    @{ Dir="Anthropic"; File="Claude Sonnet 4.6.txt"; Title="Claude Sonnet 4.6 系统提示词"; Desc="Anthropic Claude Sonnet 4.6 模型的官方系统提示词，包含产品信息、行为规范和工具使用指南"; CatId="c10000000005"; ModelConf='{"model":"claude-sonnet-4","provider":"anthropic","temperature":0.7}'; ModelTag="t10000000003"; IsAgent=$false; IsCoding=$true }
    @{ Dir="Google/Gemini"; File="AI Studio vibe-coder.txt"; Title="Google Gemini AI Studio vibe-coder 提示词"; Desc="Google Gemini AI Studio 的前端代码生成提示词，支持 React + Tailwind 应用开发"; CatId="c10000000005"; ModelConf='{"model":"gemini-2.5-pro","provider":"google","temperature":0.7}'; ModelTag="t10000000002"; IsAgent=$false; IsCoding=$true }
    @{ Dir="v0 Prompts and Tools"; File="Prompt.txt"; Title="Vercel v0 AI 助手提示词"; Desc="Vercel v0 AI 前端开发助手的官方系统提示词，专注于 React/Next.js 组件生成"; CatId="c10000000006"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Trae"; File="Builder Prompt.txt"; Title="Trae AI 编程助手提示词"; Desc="Trae IDE AI 编程助手的官方系统提示词，支持代码搜索、编辑和终端操作"; CatId="c10000000005"; ModelConf='{"model":"gpt-4","provider":"openai","temperature":0.7}'; ModelTag="t10000000001"; IsAgent=$true; IsCoding=$true }
    @{ Dir="VSCode Agent"; File="gpt-5.txt"; Title="VSCode Agent (GPT-5) 提示词"; Desc="VSCode Agent 基于 GPT-5 的编码助手官方系统提示词，支持自主编码和工具调用"; CatId="c10000000005"; ModelConf='{"model":"gpt-4","provider":"openai","temperature":0.7}'; ModelTag="t10000000001"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Augment Code"; File="gpt-5-agent-prompts.txt"; Title="Augment Code Agent 提示词"; Desc="Augment Code 基于 GPT-5 的编码助手官方系统提示词，支持代码库上下文引擎"; CatId="c10000000005"; ModelConf='{"model":"gpt-4","provider":"openai","temperature":0.7}'; ModelTag="t10000000001"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Perplexity"; File="Prompt.txt"; Title="Perplexity AI 搜索助手提示词"; Desc="Perplexity AI 搜索助手的官方系统提示词，支持学术研究、新闻、编程等多种查询类型"; CatId="c10000000002"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$false; IsCoding=$false }
    @{ Dir="Replit"; File="Prompt.txt"; Title="Replit AI 编程助手提示词"; Desc="Replit 在线 IDE AI 助手的官方系统提示词，支持文件编辑、Shell命令和工作流配置"; CatId="c10000000005"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$false; IsCoding=$true }
    @{ Dir="Warp.dev"; File="Prompt.txt"; Title="Warp Agent Mode 提示词"; Desc="Warp AI 终端 Agent 模式的官方系统提示词，支持终端内软件开发任务"; CatId="c10000000005"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Kiro"; File="Spec_Prompt.txt"; Title="Kiro IDE AI 助手提示词"; Desc="Amazon Kiro IDE AI 助手的官方系统提示词，支持规范驱动开发和代码生成"; CatId="c10000000005"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Xcode"; File="System.txt"; Title="Xcode AI 编码助手提示词"; Desc="Apple Xcode AI 编码助手的官方系统提示词，专注于 Swift/Apple 平台开发"; CatId="c10000000005"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$false; IsCoding=$true }
    @{ Dir="Lovable"; File="Agent Prompt.txt"; Title="Lovable AI 编辑器提示词"; Desc="Lovable AI Web 应用编辑器的官方系统提示词，基于 React/Vite/Tailwind 技术栈"; CatId="c10000000006"; ModelConf='{"model":"claude-sonnet-4","provider":"anthropic","temperature":0.7}'; ModelTag="t10000000003"; IsAgent=$true; IsCoding=$true }
    @{ Dir="NotionAi"; File="Prompt.txt"; Title="Notion AI 助手提示词"; Desc="Notion AI 助手的官方系统提示词，支持页面编辑、数据库操作和内容搜索"; CatId="c10000000002"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$true; IsCoding=$false }
    @{ Dir="Same.dev"; File="Prompt.txt"; Title="Same.dev AI 编程助手提示词"; Desc="Same.dev 云端 IDE AI 编程助手的官方系统提示词，基于 GPT-4.1 模型"; CatId="c10000000006"; ModelConf='{"model":"gpt-4","provider":"openai","temperature":0.7}'; ModelTag="t10000000001"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Comet Assistant"; File="System Prompt.txt"; Title="Comet AI 助手提示词"; Desc="Perplexity Comet 浏览器助手的官方系统提示词，支持网页浏览和自动化操作"; CatId="c10000000002"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$true; IsCoding=$false }
    @{ Dir="Emergent"; File="Prompt.txt"; Title="Emergent E1 Agent 提示词"; Desc="Emergent E1 全栈应用开发 Agent 的官方系统提示词，支持 React + FastAPI + MongoDB"; CatId="c10000000005"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Leap.new"; File="Prompts.txt"; Title="Leap AI 开发助手提示词"; Desc="Leap.new AI 开发助手的官方系统提示词，专注于 REST API 后端和 TypeScript/Encore.ts 开发"; CatId="c10000000001"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Orchids.app"; File="System Prompt.txt"; Title="Orchids AI 编程助手提示词"; Desc="Orchids AI 编程助手的官方系统提示词，基于 Next.js 15 + Shadcn/UI TypeScript"; CatId="c10000000003"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$true; IsCoding=$true }
    @{ Dir="CodeBuddy Prompts"; File="Craft Prompt.txt"; Title="CodeBuddy Craft 提示词"; Desc="CodeBuddy Craft 编程助手的官方系统提示词，支持文件编辑和终端操作"; CatId="c10000000005"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Cluely"; File="Enterprise Prompt.txt"; Title="Cluely 企业版会议助手提示词"; Desc="Cluely 企业版实时会议助手的官方系统提示词，支持屏幕阅读和对话分析"; CatId="c10000000003"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$true; IsCoding=$false }
    @{ Dir="Junie"; File="Prompt.txt"; Title="Junie AI 编程助手提示词"; Desc="JetBrains Junie AI 编程助手的官方系统提示词，支持项目搜索和代码分析"; CatId="c10000000005"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$false; IsCoding=$true }
    @{ Dir="Amp"; File="claude-4-sonnet.yaml"; Title="Amp AI 编码 Agent 提示词"; Desc="Sourcegraph Amp AI 编码 Agent 的官方系统提示词，基于 Claude 4 Sonnet 模型"; CatId="c10000000005"; ModelConf='{"model":"claude-sonnet-4","provider":"anthropic","temperature":0.7}'; ModelTag="t10000000003"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Open Source prompts/Cline"; File="Prompt.txt"; Title="Cline 开源编程助手提示词"; Desc="Cline 开源 AI 编程助手的官方系统提示词，支持文件操作和命令执行"; CatId="c10000000005"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Open Source prompts/RooCode"; File="Prompt.txt"; Title="RooCode 开源编程助手提示词"; Desc="RooCode 开源 AI 编程助手的官方系统提示词，支持多种开发模式"; CatId="c10000000005"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Open Source prompts/Bolt"; File="Prompt.txt"; Title="Bolt 开源 AI 助手提示词"; Desc="Bolt.new 开源 AI Web 开发助手的官方系统提示词，基于 WebContainer 运行时"; CatId="c10000000005"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$true; IsCoding=$true }
    @{ Dir="Open Source prompts/Codex CLI"; File="Prompt.txt"; Title="Codex CLI 开源编码助手提示词"; Desc="OpenAI Codex CLI 开源终端编码助手的官方系统提示词，支持沙盒执行和 Git 集成"; CatId="c10000000005"; ModelConf='{"model":"gpt-4","provider":"openai","temperature":0.7}'; ModelTag="t10000000001"; IsAgent=$true; IsCoding=$true }
    @{ Dir="dia"; File="Prompt.txt"; Title="Dia 浏览器 AI 助手提示词"; Desc="The Browser Company Dia 浏览器内置 AI 助手的官方系统提示词，支持 Ask Dia 超链接和引用"; CatId="c10000000005"; ModelConf='{"model":"auto","provider":"multi","temperature":0.7}'; ModelTag="t10000000004"; IsAgent=$false; IsCoding=$false }
)

function Escape-MySqlString([string]$s) {
    if ($null -eq $s) { return "NULL" }
    # Order matters: backslash first
    $s = $s.Replace('\', '\\')
    # Single quotes
    $s = $s.Replace("'", "\'")
    # Null bytes - use string replace
    $s = $s.Replace([string][char]0, '\0')
    # Newlines -> literal \n
    $s = $s.Replace("`r`n", "\n")
    $s = $s.Replace("`r", "\n")
    $s = $s.Replace("`n", "\n")
    # Tabs
    $s = $s.Replace("`t", "\t")
    # Remove other control characters (backspace, form feed, etc.)
    $result = [System.Text.StringBuilder]::new()
    foreach ($ch in $s.ToCharArray()) {
        if ([int]$ch -lt 32) {
            # Skip control characters (already handled above for \n, \t)
        } else {
            [void]$result.Append($ch)
        }
    }
    return "'" + $result.ToString() + "'"
}

function Get-Id([string]$prefix, [int]$index) {
    # p20000000001 = prefix "p2" + 10 digits; pv2000000001 = prefix "pv2" + 9 digits
    if ($prefix.StartsWith("pv")) {
        return "$prefix$($index.ToString('D9'))"
    } else {
        return "$prefix$($index.ToString('D10'))"
    }
}

# Main
Write-Host "============================================================"
Write-Host "PromptMS Official AI Prompts Seed Data Generator"
Write-Host "============================================================"

# Download all prompts
Write-Host "`n[1/3] Downloading prompt files from GitHub..."
$downloaded = @()
$seq = 0

foreach ($p in $Prompts) {
    $seq++
    $encodedDir = $p.Dir -replace ' ', '%20' -replace '&', '%26'
    $encodedFile = $p.File -replace ' ', '%20' -replace '&', '%26'
    $url = "${BaseUrl}${encodedDir}/${encodedFile}"

    Write-Host "  Downloading: $($p.Dir)/$($p.File) ..." -NoNewline

    try {
        $wc = New-Object System.Net.WebClient
        $wc.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
        $wc.Encoding = [System.Text.Encoding]::UTF8
        $content = $wc.DownloadString($url)
        Write-Host " OK ($($content.Length) chars)"
        $downloaded += @{ Seq=$seq; Prompt=$p; Content=$content }
    } catch {
        Write-Host " FAILED, retrying..."
        # Retry once
        try {
            Start-Sleep -Seconds 3
            $wc2 = New-Object System.Net.WebClient
            $wc2.Headers.Add("User-Agent", "Mozilla/5.0 (Windows NT 10.0; Win64; x64)")
            $wc2.Encoding = [System.Text.Encoding]::UTF8
            $content = $wc2.DownloadString($url)
            Write-Host "  RETRY OK ($($content.Length) chars)"
            $downloaded += @{ Seq=$seq; Prompt=$p; Content=$content }
        } catch {
            Write-Host "  RETRY FAILED - skipping"
        }
    }
}

Write-Host "`nDownloaded $($downloaded.Count)/$($Prompts.Count) prompts successfully."

if ($downloaded.Count -lt 20) {
    Write-Host "ERROR: Less than 20 prompts downloaded. Aborting."
    exit 1
}

# Generate SQL
Write-Host "`n[2/3] Generating SQL statements..."

$sb = [System.Text.StringBuilder]::new()

[void]$sb.AppendLine("-- ============================================================")
[void]$sb.AppendLine("-- PromptMS Official AI Prompts Seed Data")
[void]$sb.AppendLine("-- Imported from: https://github.com/x1xhlol/system-prompts-and-models-of-ai-tools")
[void]$sb.AppendLine("-- Date: $(Get-Date -Format 'yyyy-MM-dd')")
[void]$sb.AppendLine("-- ============================================================")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("USE promptms;")
[void]$sb.AppendLine("")
[void]$sb.AppendLine("-- Disable foreign key checks for safe insertion")
[void]$sb.AppendLine("SET FOREIGN_KEY_CHECKS = 0;")
[void]$sb.AppendLine("")

# New tags
[void]$sb.AppendLine("-- ============================================================")
[void]$sb.AppendLine("-- New Tags for Official Prompts")
[void]$sb.AppendLine("-- ============================================================")
[void]$sb.AppendLine("INSERT INTO tags (id, name, color) VALUES")
[void]$sb.AppendLine("('t10000000009', '官方提示词', '#ff4d4f'),")
[void]$sb.AppendLine("('t10000000010', 'AI编程', '#597ef7'),")
[void]$sb.AppendLine("('t10000000011', 'Agent', '#9254de')")
[void]$sb.AppendLine("ON DUPLICATE KEY UPDATE name = VALUES(name), color = VALUES(color);")
[void]$sb.AppendLine("")

# Prompts
[void]$sb.AppendLine("-- ============================================================")
[void]$sb.AppendLine("-- Prompts")
[void]$sb.AppendLine("-- ============================================================")

$promptIds = @()
$idx = 0
foreach ($d in $downloaded) {
    $idx++
    $promptId = Get-Id "p2" $idx
    $promptIds += $promptId
    $p = $d.Prompt
    $content = $d.Content

    $titleEsc = Escape-MySqlString $p.Title
    $descEsc = Escape-MySqlString $p.Desc
    $contentEsc = Escape-MySqlString $content
    $modelConfEsc = Escape-MySqlString $p.ModelConf
    $metaJson = @{source="github/x1xhlol/system-prompts-and-models-of-ai-tools"; product=$p.Dir; file=$p.File} | ConvertTo-Json -Compress
    $metaEsc = Escape-MySqlString $metaJson
    $catIdEsc = Escape-MySqlString $p.CatId

    [void]$sb.AppendLine("-- Prompt ${idx}: $($p.Title)")
    [void]$sb.AppendLine("INSERT INTO prompts (id, title, description, content, variables, model_config, current_version, workspace_id, created_by, category_id, visibility, metrics, metadata, deleted_at, created_at, updated_at)")
    [void]$sb.AppendLine("VALUES ($(Escape-MySqlString $promptId), $titleEsc, $descEsc, $contentEsc, NULL, $modelConfEsc, 1, NULL, 'u10000000001', $catIdEsc, 'public', NULL, $metaEsc, NULL, NOW(), NOW());")
    [void]$sb.AppendLine("")
}

# Prompt Versions
[void]$sb.AppendLine("-- ============================================================")
[void]$sb.AppendLine("-- Prompt Versions")
[void]$sb.AppendLine("-- ============================================================")

$idx = 0
foreach ($d in $downloaded) {
    $idx++
    $promptId = $promptIds[$idx - 1]
    $versionId = Get-Id "pv2" $idx
    $p = $d.Prompt
    $content = $d.Content

    $contentEsc = Escape-MySqlString $content
    $modelConfEsc = Escape-MySqlString $p.ModelConf

    [void]$sb.AppendLine("-- Version for Prompt ${idx}: $($p.Title)")
    [void]$sb.AppendLine("INSERT INTO prompt_versions (id, prompt_id, version, version_tag, content, variables, model_config, change_type, change_log, execution_count, avg_score, is_stable, is_current, created_by, created_at)")
    [void]$sb.AppendLine("VALUES ($(Escape-MySqlString $versionId), $(Escape-MySqlString $promptId), 1, 'v1.0', $contentEsc, NULL, $modelConfEsc, 'create', 'Imported from official AI tool prompts collection', 0, NULL, 1, 1, 'u10000000001', NOW());")
    [void]$sb.AppendLine("")
}

# Prompt Tags
[void]$sb.AppendLine("-- ============================================================")
[void]$sb.AppendLine("-- Prompt Tags Associations")
[void]$sb.AppendLine("-- ============================================================")

$tagValues = @()
$idx = 0
foreach ($d in $downloaded) {
    $idx++
    $promptId = $promptIds[$idx - 1]
    $p = $d.Prompt

    # 官方提示词 tag
    $tagValues += "($(Escape-MySqlString $promptId), 't10000000009')"
    # Model tag
    $tagValues += "($(Escape-MySqlString $promptId), $(Escape-MySqlString $p.ModelTag))"
    # AI编程 tag
    if ($p.IsCoding) {
        $tagValues += "($(Escape-MySqlString $promptId), 't10000000010')"
    }
    # Agent tag
    if ($p.IsAgent) {
        $tagValues += "($(Escape-MySqlString $promptId), 't10000000011')"
    }
}

# Split into batches
$batchSize = 50
for ($i = 0; $i -lt $tagValues.Count; $i += $batchSize) {
    $end = [Math]::Min($i + $batchSize, $tagValues.Count)
    $batch = $tagValues[$i..($end-1)]
    [void]$sb.AppendLine("INSERT INTO prompt_tags (prompt_id, tag_id) VALUES")
    [void]$sb.AppendLine(($batch -join ",`n"))
    [void]$sb.AppendLine("ON DUPLICATE KEY UPDATE prompt_id = VALUES(prompt_id);")
    [void]$sb.AppendLine("")
}

# Re-enable foreign key checks
[void]$sb.AppendLine("-- Re-enable foreign key checks")
[void]$sb.AppendLine("SET FOREIGN_KEY_CHECKS = 1;")
[void]$sb.AppendLine("")

# Write to file
Write-Host "`n[3/3] Writing SQL file to: $OutputFile"
[System.IO.File]::WriteAllText($OutputFile, $sb.ToString(), [System.Text.Encoding]::UTF8)

$fileSize = (Get-Item $OutputFile).Length
Write-Host "`nDone! Generated SQL file: $OutputFile"
Write-Host "  - Prompts imported: $($downloaded.Count)"
Write-Host "  - Tag associations: $($tagValues.Count)"
Write-Host "  - File size: $([math]::Round($fileSize / 1024, 1)) KB"
