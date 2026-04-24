import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';

const requested = process.argv.slice(2).map((path) => resolve(path));
const present = requested.filter((path) => existsSync(path));
const missing = requested.filter((path) => !existsSync(path));

if (missing.length > 0) {
  console.warn('[omx] Skipping missing test files:');
  for (const file of missing) {
    console.warn(`- ${file}`);
  }
}

if (present.length === 0) {
  console.error('[omx] No requested test files exist.');
  process.exit(1);
}

const result = spawnSync(process.execPath, ['--test', ...present], {
  stdio: 'inherit',
  env: process.env,
});

if (typeof result.status === 'number') {
  process.exit(result.status);
}

process.exit(1);
