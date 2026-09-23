#!/usr/bin/env node
// @ts-check

/**
 * Runs the public API type tests in `tests/dts`.
 *
 * By default they run inside the monorepo, against the built declaration files of each package.
 *
 * With `--userland` they run the way an application sees the packages: outside of the monorepo,
 * installed from packed tarballs. Inside the monorepo every dependency is hoisted to the root
 * `node_modules`, so declaration files can resolve modules (or `@types/*` packages) that a package
 * never declares. In userland mode every workspace package the tests depend on is packed, then
 * installed with pnpm so that each package only sees its own `dependencies` and `peerDependencies`:
 *   - hoisting is disabled
 *   - packages are linked from pnpm's global virtual store, outside of the application, so they
 *     cannot resolve modules from the application's `node_modules` either
 *   - peer dependency issues fail the install
 *
 * `tests/dts/package.json` describes the consumer:
 *   - `workspace:` dependencies resolve to their tarballs (also forced for transitive dependencies)
 *   - `catalog:` dependencies resolve to the exact version installed in the repository
 *   - anything else is kept as is
 *
 * Test files are CommonJS, like the applications the Strapi CLI runs. With `--esm` (userland only)
 * the application is an ES module instead, so packages resolve through their `import` condition.
 *
 * Every workspace package involved must be built first.
 *
 * @example
 * node tests/scripts/run-dts-tests.mjs [--userland [--esm] [--keep]] [-- <vitest args>]
 */

import { execFileSync } from 'node:child_process';
import console from 'node:console';
import fs from 'node:fs';
import { createRequire } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import process from 'node:process';
import { fileURLToPath } from 'node:url';

/**
 * @typedef {Record<string, string>} Dependencies Dependency names mapped to version specifiers
 */

/**
 * @typedef {Map<string, string>} Workspaces Workspace package names mapped to their absolute paths
 */

/**
 * @typedef {object} PackageJson The fields of a `package.json` this script reads
 * @property {string} [name]
 * @property {'module' | 'commonjs'} [type]
 * @property {Dependencies} [dependencies]
 * @property {Dependencies} [devDependencies]
 * @property {Dependencies} [peerDependencies]
 */

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const testsDir = path.join(repoRoot, 'tests', 'dts');

const separator = process.argv.indexOf('--');
const args = separator === -1 ? process.argv.slice(2) : process.argv.slice(2, separator);
const vitestArgs = separator === -1 ? [] : process.argv.slice(separator + 1);

/** Run against packed tarballs in an isolated install instead of the monorepo */
const userland = args.includes('--userland');

/** Make the userland application an ES module instead of CommonJS */
const esm = args.includes('--esm');

/** Keep the temporary userland project for inspection */
const keep = args.includes('--keep');

/** pnpm version run through corepack for userland installs */
const PNPM = ['pnpm@10'];

/** Vitest configuration file, relative to `tests/dts` */
const CONFIG = 'vitest.config.mts';

/**
 * Runs a command synchronously, streaming its output by default.
 *
 * @param {string} command
 * @param {string[]} commandArgs
 * @param {import('node:child_process').ExecFileSyncOptions} [options]
 * @throws When the command exits with a non-zero code
 */
const run = (command, commandArgs, options = {}) => {
  execFileSync(command, commandArgs, { stdio: 'inherit', ...options });
};

/**
 * @param {string} file Absolute path to a `package.json`
 * @returns {PackageJson}
 */
const readPackageJson = (file) => JSON.parse(fs.readFileSync(file, 'utf8'));

/**
 * @param {Dependencies} dependencies
 * @returns {string[]} The names of the dependencies using the `workspace:` protocol
 */
const getWorkspaceDependencies = (dependencies) =>
  Object.entries(dependencies)
    .filter(([, specifier]) => specifier.startsWith('workspace:'))
    .map(([name]) => name);

/**
 * @returns {Workspaces} Every workspace of the monorepo
 */
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
 * Collects every workspace package reachable from the given ones through `dependencies` and
 * `peerDependencies`.
 *
 * @param {Workspaces} workspaces
 * @param {string[]} names
 * @returns {Set<string>} The given packages and all their workspace dependencies
 */
const getWorkspaceClosure = (workspaces, names) => {
  /** @type {Set<string>} */
  const closure = new Set();
  const queue = [...names];

  while (queue.length > 0) {
    const name = /** @type {string} */ (queue.pop());

    if (closure.has(name)) {
      continue;
    }

    closure.add(name);

    const pkg = readPackageJson(path.join(getWorkspacePath(workspaces, name), 'package.json'));
    const dependencies = Object.keys({ ...pkg.dependencies, ...pkg.peerDependencies });

    queue.push(...dependencies.filter((dependency) => workspaces.has(dependency)));
  }

  return closure;
};

/**
 * @param {Workspaces} workspaces
 * @param {string} name
 * @returns {string} The absolute path of the workspace package
 * @throws When the package is not a workspace of the monorepo
 */
const getWorkspacePath = (workspaces, name) => {
  const location = workspaces.get(name);

  if (!location) {
    throw new Error(`${name} is not a workspace package`);
  }

  return location;
};

/**
 * @param {Workspaces} workspaces
 * @param {Iterable<string>} names
 * @throws When one of the packages has no `dist` directory
 */
const assertBuilt = (workspaces, names) => {
  const missing = [...names].filter(
    (name) => !fs.existsSync(path.join(getWorkspacePath(workspaces, name), 'dist'))
  );

  if (missing.length > 0) {
    throw new Error(`Build these packages first: ${missing.join(', ')}`);
  }
};

/**
 * Ensures no ancestor of the directory has a `node_modules` directory, from which modules could
 * resolve and hide missing dependencies again.
 *
 * @param {string} dir
 * @throws When an ancestor has a `node_modules` directory
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

/**
 * Ensures packages are linked from pnpm's global virtual store. Packages installed inside the
 * application could resolve modules from the application's own `node_modules`, for example
 * `@types/*` packages it installs, and hide dependencies they do not declare.
 *
 * @param {string} appDir
 * @param {string[]} names Packages the application depends on
 * @throws When one of the packages is installed inside the application
 */
const assertLinkedFromGlobalStore = (appDir, names) => {
  for (const name of names) {
    const location = fs.realpathSync(path.join(appDir, 'node_modules', name));

    if (!path.relative(appDir, location).startsWith('..')) {
      throw new Error(`${name} is installed in ${location}, not in pnpm's global virtual store`);
    }
  }
};

/**
 * Runs the type tests inside the monorepo.
 *
 * @param {Workspaces} workspaces
 * @param {PackageJson} consumer The manifest of `tests/dts`
 */
const runInRepository = (workspaces, consumer) => {
  assertBuilt(workspaces, getWorkspaceDependencies(consumer.devDependencies ?? {}));

  run('yarn', ['vitest', '--config', CONFIG, ...vitestArgs], { cwd: testsDir });
};

/**
 * Runs the type tests in a temporary project outside of the monorepo, with the workspace packages
 * installed from packed tarballs by pnpm with hoisting disabled.
 *
 * @param {Workspaces} workspaces
 * @param {PackageJson} consumer The manifest of `tests/dts`
 */
const runInUserland = (workspaces, consumer) => {
  const consumerDependencies = consumer.devDependencies ?? {};
  const closure = getWorkspaceClosure(workspaces, getWorkspaceDependencies(consumerDependencies));

  assertBuilt(workspaces, closure);

  const tmpDir = fs.mkdtempSync(path.join(fs.realpathSync(os.tmpdir()), 'strapi-dts-tests-'));
  const tarballsDir = path.join(tmpDir, 'tarballs');
  const appDir = path.join(tmpDir, 'app');

  try {
    assertIsolated(tmpDir);
    fs.mkdirSync(tarballsDir);

    console.log(`Packing ${closure.size} workspace package(s) into ${tarballsDir}`);

    /** @type {Dependencies} Workspace package names mapped to `file:` tarball specifiers */
    const tarballs = {};

    for (const name of [...closure].sort()) {
      const tarball = path.join(tarballsDir, `${name.replace('@', '').replace('/', '-')}.tgz`);

      run('yarn', ['pack', '--out', tarball], {
        cwd: getWorkspacePath(workspaces, name),
        stdio: 'ignore',
      });
      tarballs[name] = `file:${tarball}`;
    }

    const requireFromTests = createRequire(path.join(testsDir, 'package.json'));

    /**
     * Translates a monorepo version specifier into one the temporary project can install.
     *
     * @param {string} name
     * @param {string} specifier
     * @returns {string}
     */
    const resolveSpecifier = (name, specifier) => {
      if (specifier.startsWith('workspace:')) {
        return tarballs[name];
      }

      if (specifier.startsWith('catalog:')) {
        return requireFromTests(`${name}/package.json`).version;
      }

      return specifier;
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
          // The module format decides how test files resolve packages
          type: esm ? 'module' : consumer.type,
          devDependencies: Object.fromEntries(
            Object.entries(consumerDependencies).map(([name, specifier]) => [
              name,
              resolveSpecifier(name, specifier),
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
        'strictPeerDependencies: true',
        'enableGlobalVirtualStore: true',
        'peerDependencyRules:',
        '  allowedVersions:',
        // `codemirror5` (`npm:codemirror@5`) of @strapi/admin and @strapi/content-manager is matched
        // against the `codemirror@>=6` peer of @uiw/react-codemirror by its real package name
        "    '@uiw/react-codemirror>codemirror': '5'",
        'overrides:',
        ...Object.entries(tarballs).map(([name, specifier]) => `  '${name}': '${specifier}'`),
        '',
      ].join('\n')
    );

    // pnpm disables the global virtual store when it detects a CI environment
    const env = { ...process.env, COREPACK_ENABLE_DOWNLOAD_PROMPT: '0', CI: 'false' };

    console.log(`Installing ${appDir}`);
    run('corepack', [...PNPM, 'install', '--ignore-scripts'], { cwd: appDir, env });

    assertLinkedFromGlobalStore(appDir, getWorkspaceDependencies(consumerDependencies));

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
  const consumer = readPackageJson(path.join(testsDir, 'package.json'));

  try {
    if (esm && !userland) {
      throw new Error('--esm is only supported with --userland');
    }

    if (userland) {
      runInUserland(workspaces, consumer);
    } else {
      runInRepository(workspaces, consumer);
    }
  } catch (error) {
    process.exitCode = 1;

    // Failed child processes already printed their output
    if (!(error instanceof Error && 'status' in error)) {
      console.error(error instanceof Error ? error.message : error);
    }
  }
};

main();
