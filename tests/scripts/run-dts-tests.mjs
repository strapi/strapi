#!/usr/bin/env node

/**
 * Runs the public API type tests in `tests/dts`.
 *
 * By default they run inside the monorepo, against the built declaration files of each package.
 *
 * With `--userland` they run the way an application sees the packages: outside of the monorepo,
 * installed from packed tarballs. Inside the monorepo every dependency is hoisted to the root
 * `node_modules`, so declaration files can resolve modules (or `@types/*` packages) that a package
 * never declares. In userland mode every workspace package the tests depend on is packed, then
 * installed with pnpm and hoisting disabled, so each package only sees its own `dependencies` and
 * `peerDependencies`.
 *
 * `tests/dts/package.json` describes the consumer:
 *   - `workspace:` dependencies resolve to their tarballs (also forced for transitive dependencies)
 *   - `catalog:` dependencies resolve to the exact version installed in the repository
 *   - anything else is kept as is
 *
 * Every workspace package involved must be built first.
 *
 * Usage:
 *   node tests/scripts/run-dts-tests.mjs [--userland] [--keep] [-- <vitest args>]
 */

import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const testsDir = path.join(repoRoot, 'tests', 'dts');

const separator = process.argv.indexOf('--');
const args = separator === -1 ? process.argv.slice(2) : process.argv.slice(2, separator);
const vitestArgs = separator === -1 ? [] : process.argv.slice(separator + 1);

const userland = args.includes('--userland');
const keep = args.includes('--keep');

const PNPM = ['pnpm@10'];
const CONFIG = 'vitest.config.ts';

const run = (command, commandArgs, options = {}) =>
  execFileSync(command, commandArgs, { stdio: 'inherit', ...options });

const readJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

const getWorkspaceDependencies = (dependencies) =>
  Object.entries(dependencies)
    .filter(([, range]) => range.startsWith('workspace:'))
    .map(([name]) => name);

const getWorkspaces = () => {
  const output = execFileSync('yarn', ['workspaces', 'list', '--json'], {
    cwd: repoRoot,
    encoding: 'utf8',
  });

  return new Map(
    output
      .trim()
      .split('\n')
      .map((line) => JSON.parse(line))
      .map(({ name, location }) => [name, path.join(repoRoot, location)])
  );
};

/**
 * Every workspace package reachable from the given ones through `dependencies` and
 * `peerDependencies`, including themselves.
 */
const getWorkspaceClosure = (workspaces, names) => {
  const closure = new Set();
  const queue = [...names];

  while (queue.length > 0) {
    const name = queue.pop();

    if (closure.has(name)) {
      continue;
    }

    closure.add(name);

    const pkg = readJson(path.join(workspaces.get(name), 'package.json'));
    const dependencies = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });

    queue.push(...dependencies.filter((dependency) => workspaces.has(dependency)));
  }

  return closure;
};

const assertBuilt = (workspaces, names) => {
  const missing = [...names].filter(
    (name) => !fs.existsSync(path.join(workspaces.get(name), 'dist'))
  );

  if (missing.length > 0) {
    throw new Error(`Build these packages first: ${missing.join(', ')}`);
  }
};

/**
 * The temporary project must not have a `node_modules` directory in any ancestor, otherwise
 * modules could resolve from there and hide missing dependencies again.
 */
const assertIsolated = (dir) => {
  for (
    let current = path.dirname(dir);
    current !== path.dirname(current);
    current = path.dirname(current)
  ) {
    if (fs.existsSync(path.join(current, 'node_modules'))) {
      throw new Error(`${dir} is not isolated: ${path.join(current, 'node_modules')} exists`);
    }
  }
};

const runInRepository = (workspaces, consumerDependencies) => {
  assertBuilt(workspaces, getWorkspaceDependencies(consumerDependencies));

  run('yarn', ['vitest', '--config', CONFIG, ...vitestArgs], { cwd: testsDir });
};

const runInUserland = (workspaces, consumerDependencies) => {
  const closure = getWorkspaceClosure(workspaces, getWorkspaceDependencies(consumerDependencies));

  assertBuilt(workspaces, closure);

  const tmpDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'strapi-dts-tests-'));
  const tarballsDir = path.join(tmpDir, 'tarballs');
  const appDir = path.join(tmpDir, 'app');

  try {
    assertIsolated(tmpDir);
    fs.mkdirSync(tarballsDir);

    console.log(`Packing ${closure.size} workspace package(s) into ${tarballsDir}`);

    const tarballs = {};

    for (const name of [...closure].sort()) {
      const tarball = path.join(tarballsDir, `${name.replace('@', '').replace('/', '-')}.tgz`);

      run('yarn', ['pack', '--out', tarball], { cwd: workspaces.get(name), stdio: 'ignore' });
      tarballs[name] = `file:${tarball}`;
    }

    const requireFromTests = createRequire(path.join(testsDir, 'package.json'));

    const resolveSpecifier = (name, range) => {
      if (range.startsWith('workspace:')) {
        return tarballs[name];
      }

      if (range.startsWith('catalog:')) {
        return requireFromTests(`${name}/package.json`).version;
      }

      return range;
    };

    fs.cpSync(testsDir, appDir, {
      recursive: true,
      filter: (source) => path.basename(source) !== 'node_modules',
    });

    fs.writeFileSync(
      path.join(appDir, 'package.json'),
      JSON.stringify(
        {
          name: 'strapi-dts-tests-app',
          private: true,
          devDependencies: Object.fromEntries(
            Object.entries(consumerDependencies).map(([name, range]) => [
              name,
              resolveSpecifier(name, range),
            ])
          ),
        },
        null,
        2
      )
    );

    // Hoisting disabled: packages cannot reach each other's undeclared dependencies
    fs.writeFileSync(
      path.join(appDir, 'pnpm-workspace.yaml'),
      [
        'hoist: false',
        'publicHoistPattern: []',
        'overrides:',
        ...Object.entries(tarballs).map(([name, specifier]) => `  '${name}': '${specifier}'`),
        '',
      ].join('\n')
    );

    const env = { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0', CI: 'true' };

    console.log(`Installing ${appDir}`);
    run('corepack', [...PNPM, 'install', '--ignore-scripts'], { cwd: appDir, env });

    console.log(`Running type tests in ${appDir}`);
    run('corepack', [...PNPM, 'exec', 'vitest', '--config', CONFIG, ...vitestArgs], {
      cwd: appDir,
      env,
    });
  } finally {
    if (keep) {
      console.log(`Kept ${tmpDir}`);
    } else {
      fs.rmSync(tmpDir, { recursive: true, force: true });
    }
  }
};

const main = () => {
  const workspaces = getWorkspaces();
  const consumerDependencies = readJson(path.join(testsDir, 'package.json')).devDependencies ?? {};

  try {
    if (userland) {
      runInUserland(workspaces, consumerDependencies);
    } else {
      runInRepository(workspaces, consumerDependencies);
    }
  } catch (error) {
    process.exitCode = 1;

    // Failed child processes already printed their output
    if (error.status === undefined) {
      console.error(error.message);
    }
  }
};

main();
