/**
 * Update license information from MIT to CC0-1.0
 * Run: npx wrangler d1 execute promptbridge007 --local --file=scripts/update-license-cc0.sql
 *      npx wrangler d1 execute promptbridge007 --remote --file=scripts/update-license-cc0.sql
 */

-- Update all files from system_prompts_leaks to CC0-1.0
UPDATE files
SET
    repo_license = 'CC0-1.0',
    license = 'CC0-1.0',
    license_url = 'https://creativecommons.org/publicdomain/zero/1.0/',
    updated_at = datetime('now')
WHERE repo_name = 'system_prompts_leaks';
