const path = require('node:path');
const { spawnSync } = require('node:child_process');
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--dry-run')) {
  throw new Error('Only --dry-run is accepted. Worker, account, config and environment overrides are forbidden.');
}
require('./prepare-ai-works.cjs');
const root = path.resolve(__dirname, '..');
const wrangler = path.join(root, 'node_modules', 'wrangler', 'bin', 'wrangler.js');
const result = spawnSync(process.execPath, [wrangler, 'deploy', '--config', path.join(root, 'wrangler.jsonc'), '--name', 'banana-needs-no-reason', '--env', '', '--keep-vars', ...args], { cwd: root, stdio: 'inherit' });
if (result.error) throw result.error;
process.exit(result.status ?? 1);
