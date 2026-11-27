// @ts-check
/**
 * ESLint on the TypeScript files of the ui suite changed since `base` (default: the last commit),
 * with the suite's config. Generated code goes through the same lint as the rest of the repo.
 */
import { spawnSync } from 'node:child_process';
import path from 'node:path';

import { changedFilesSince } from './git.mjs';
import { loadConfig, REPO_ROOT } from './lib.mjs';

/** @returns {{ ok: boolean, output: string, files: string[] }} */
export const lintChanged = (base = 'HEAD') => {
  const config = loadConfig();
  const prefix = `${config.paths.suite}/`;
  const files = changedFilesSince(base)
    .filter((file) => file.startsWith(prefix) && file.endsWith('.ts'))
    .filter((file) => !file.startsWith(`${config.paths.scratch}/`))
    .map((file) => file.slice(prefix.length));
  if (!files.length) return { ok: true, output: '', files };

  const result = spawnSync('yarn', ['run', '-T', 'eslint', '--max-warnings=0', ...files], {
    cwd: path.join(REPO_ROOT, config.paths.suite),
    encoding: 'utf8',
  });
  return { ok: result.status === 0, output: `${result.stdout}${result.stderr}`.trim(), files };
};
