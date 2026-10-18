// Plain ESM so both the plugin and `scripts/scaffold-package-docs.mjs` can use it.
import fs from 'node:fs';
import path from 'node:path';

import { getPackageGroup } from './groups.mjs';

/** @typedef {import('./types').WorkspacePackage} WorkspacePackage */
/** @typedef {import('./types').PackageEdge} PackageEdge */
/** @typedef {import('./types').DependencyKind} DependencyKind */

/** Only workspaces under this folder are documented as packages. */
const PACKAGES_PREFIX = 'packages/';

/** @type {Array<[DependencyKind, string]>} */
const DEPENDENCY_FIELDS = [
  ['prod', 'dependencies'],
  ['dev', 'devDependencies'],
  ['peer', 'peerDependencies'],
];

/**
 * @param {string} filePath
 * @returns {Record<string, unknown>}
 */
const readJson = (filePath) => JSON.parse(fs.readFileSync(filePath, 'utf8'));

/**
 * Expands a workspace pattern made of literal and `*` segments (e.g. `packages/*\/*`) into
 * repo-relative directories that contain a `package.json`. Other glob syntax is rejected so a
 * new pattern in the root `package.json` fails loudly instead of being silently skipped.
 *
 * @param {string} repoRoot
 * @param {string} pattern
 * @returns {string[]}
 */
const expandWorkspacePattern = (repoRoot, pattern) => {
  /** @type {string[]} */
  let dirs = [''];

  for (const segment of pattern.split('/')) {
    if (segment !== '*' && /[*?[\]{}!]/.test(segment) === true) {
      throw new Error(
        `[workspace-packages] Unsupported workspace pattern "${pattern}". Only literal and "*" segments are supported.`
      );
    }

    dirs = dirs.flatMap((dir) => {
      if (segment !== '*') {
        return [path.posix.join(dir, segment)];
      }

      const absoluteDir = path.join(repoRoot, dir);

      if (fs.existsSync(absoluteDir) === false) {
        return [];
      }

      return fs
        .readdirSync(absoluteDir, { withFileTypes: true })
        .filter((entry) => entry.isDirectory() === true && entry.name !== 'node_modules')
        .map((entry) => path.posix.join(dir, entry.name));
    });
  }

  return dirs.filter((dir) => fs.existsSync(path.join(repoRoot, dir, 'package.json')) === true);
};

/**
 * @param {unknown} value
 * @returns {string[]}
 */
const getDependencyNames = (value) => {
  if (typeof value !== 'object' || value === null) {
    return [];
  }

  return Object.keys(value);
};

/**
 * Reads the `packages/**` workspaces declared in the root `package.json`.
 *
 * @param {string} repoRoot absolute path of the monorepo root
 * @returns {{ packages: WorkspacePackage[], edges: PackageEdge[], manifestPaths: string[] }}
 */
export const readWorkspacePackages = (repoRoot) => {
  const rootManifestPath = path.join(repoRoot, 'package.json');
  const rootManifest = readJson(rootManifestPath);
  const workspaces = rootManifest.workspaces;

  if (Array.isArray(workspaces) === false) {
    throw new Error(`[workspace-packages] "workspaces" must be an array in ${rootManifestPath}.`);
  }

  const packageDirs = [
    ...new Set(
      workspaces
        .filter(
          (pattern) => typeof pattern === 'string' && pattern.startsWith(PACKAGES_PREFIX) === true
        )
        .flatMap((pattern) => expandWorkspacePattern(repoRoot, pattern))
    ),
  ].sort();

  const manifests = packageDirs.map((dir) => ({
    dir,
    manifestPath: path.join(repoRoot, dir, 'package.json'),
    manifest: readJson(path.join(repoRoot, dir, 'package.json')),
  }));

  /** @type {WorkspacePackage[]} */
  const packages = manifests.map(({ dir, manifestPath, manifest }) => {
    if (typeof manifest.name !== 'string' || manifest.name === '') {
      throw new Error(`[workspace-packages] Missing "name" in ${manifestPath}.`);
    }

    return {
      name: manifest.name,
      version: typeof manifest.version === 'string' ? manifest.version : '',
      description: typeof manifest.description === 'string' ? manifest.description.trim() : '',
      private: manifest.private === true,
      path: dir,
      group: getPackageGroup(dir),
    };
  });

  const packageNames = new Set(packages.map((pkg) => pkg.name));

  /** @type {PackageEdge[]} */
  const edges = manifests.flatMap(({ manifest }) =>
    DEPENDENCY_FIELDS.flatMap(([kind, field]) =>
      getDependencyNames(manifest[field])
        .filter((target) => packageNames.has(target) === true)
        .map((target) => ({ source: String(manifest.name), target, kind }))
    )
  );

  return {
    packages,
    edges,
    manifestPaths: [rootManifestPath, ...manifests.map(({ manifestPath }) => manifestPath)],
  };
};
