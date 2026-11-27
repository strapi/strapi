// @ts-check
/** Git helpers for the no-code E2E scripts. Every command runs at the repo root. */
import { execFileSync } from 'node:child_process';

import { parseUnifiedDiff, REPO_ROOT } from './lib.mjs';

/** @param {string[]} args */
export const git = (...args) =>
  execFileSync('git', args, {
    cwd: REPO_ROOT,
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
  }).trim();

export const head = () => git('rev-parse', 'HEAD');

/** @type {Set<string>} */
let baseline = new Set();

/**
 * Records the paths already changed when a script starts, such as the `dist` of the repo's
 * actions that `yarn build` rewrites: not the agents' doing, so `changesSince` leaves them out.
 */
export const markBaseline = () => {
  baseline = new Set(allChangesSince('HEAD').map((change) => change.path));
  return baseline;
};

/** Changes between `base` and the working tree, untracked files included, minus the baseline. */
export const changesSince = (/** @type {string} */ base) =>
  allChangesSince(base).filter((change) => !baseline.has(change.path));

const allChangesSince = (/** @type {string} */ base) => {
  // Intent-to-add makes untracked files show up in `git diff` without staging their content.
  git('add', '--intent-to-add', '--all');
  /** @type {Map<string, import('./lib.mjs').FileChange['status']>} */
  const statuses = new Map();
  for (const line of git('diff', '--name-status', '--no-renames', base)
    .split('\n')
    .filter(Boolean)) {
    const [status, file] = line.split('\t');
    statuses.set(file, /** @type {import('./lib.mjs').FileChange['status']} */ (status[0]));
  }
  const diff = git('diff', '--unified=0', '--no-color', '--no-renames', base);
  return parseUnifiedDiff(diff, statuses);
};

export const changedFilesSince = (/** @type {string} */ base) =>
  changesSince(base).map((change) => change.path);

/** Commits everything under `paths`, without hooks: the scripts format the files themselves. */
export const commit = (/** @type {string} */ message, /** @type {string[]} */ paths) => {
  git('add', '--all', '--', ...paths);
  if (!git('diff', '--cached', '--name-only')) return false;
  git('-c', 'core.hooksPath=/dev/null', 'commit', '--quiet', '-m', message);
  return true;
};

/** Drops every change since `ref` in `paths`, untracked files included (ignored files stay). */
export const resetTo = (/** @type {string} */ ref, /** @type {string[]} */ paths) => {
  git('reset', '--quiet', '--hard', ref);
  git('clean', '--quiet', '-fd', '--', ...paths);
};
