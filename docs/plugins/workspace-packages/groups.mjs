// Plain ESM (no Node APIs) so both the plugin and `scripts/scaffold-package-docs.mjs` can use it.

/** @typedef {import('./types').PackageGroup} PackageGroup */
/** @typedef {import('./types').PackageGroupId} PackageGroupId */

/** @type {PackageGroup[]} */
export const PACKAGE_GROUPS = [
  { id: 'core', label: 'Core', position: 2 },
  { id: 'plugins', label: 'Plugins', position: 3 },
  { id: 'providers', label: 'Providers', position: 4 },
  { id: 'utils', label: 'Utilities', position: 5 },
  { id: 'cli', label: 'CLI', position: 6 },
  { id: 'generators', label: 'Generators', position: 7 },
  // Top-level packages (e.g. `packages/admin-test-utils`) have no group folder.
  { id: 'other', label: 'Other', position: 8 },
];

/**
 * `packages/core/database` -> `core`; `packages/admin-test-utils` -> `other`.
 *
 * @param {string} repoPath repo-relative POSIX directory of the package
 * @returns {PackageGroupId}
 */
export const getPackageGroup = (repoPath) => {
  const segments = repoPath.split('/');

  if (segments.length !== 3) {
    return 'other';
  }

  const group = PACKAGE_GROUPS.find((candidate) => candidate.id === segments[1]);

  if (group === undefined) {
    throw new Error(
      `[workspace-packages] Unknown package group folder "${segments[1]}" for "${repoPath}". ` +
        'Add it to PACKAGE_GROUPS in docs/plugins/workspace-packages/groups.mjs.'
    );
  }

  return group.id;
};
