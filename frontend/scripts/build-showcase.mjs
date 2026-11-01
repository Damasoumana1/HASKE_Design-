import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const directory = fileURLToPath(new URL('..', import.meta.url));
for (const args of [
  [resolve(directory, 'node_modules/typescript/bin/tsc'), '-b'],
  [resolve(directory, 'node_modules/vite/bin/vite.js'), 'build'],
]) {
  const result = spawnSync(process.execPath, args, {
    cwd: directory,
    env: { ...process.env, VITE_SITE_MODE: 'vitrine' },
    stdio: 'inherit',
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status || 1);
}
