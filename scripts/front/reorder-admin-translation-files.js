#!/usr/bin/env node
'use strict';

/**
 * @deprecated Use `yarn verify:translations --fix` instead.
 *
 * Invokes the verifier via absolute paths (node + tsx + script) so we do not
 * resolve executables from PATH (Sonar S4036).
 */
const { spawnSync } = require('node:child_process');
const path = require('node:path');

const repoRoot = path.resolve(__dirname, '..', '..');
const scriptPath = path.join(__dirname, 'verify-translations', 'index.ts');
const tsxCli = require.resolve('tsx/cli', { paths: [repoRoot] });

const result = spawnSync(process.execPath, [tsxCli, scriptPath, '--fix'], {
  cwd: repoRoot,
  stdio: 'inherit',
});

process.exit(result.status === null ? 1 : result.status);
