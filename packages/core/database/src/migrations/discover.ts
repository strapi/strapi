import path from 'path';

import fse from 'fs-extra';

/**
 * Discover user migration files in a directory.
 * Matches umzug's non-recursive `*.{js,sql}` glob (fast-glob defaults:
 * `dot: false`, `onlyFiles: true`) with alphabetical ordering.
 */
export const discoverMigrationFiles = (dir: string): string[] => {
  if (!fse.existsSync(dir)) {
    return [];
  }

  return fse
    .readdirSync(dir, { withFileTypes: true })
    .filter(
      (entry) =>
        entry.isFile() &&
        !entry.name.startsWith('.') &&
        (entry.name.endsWith('.js') || entry.name.endsWith('.sql'))
    )
    .map((entry) => path.resolve(dir, entry.name))
    .sort();
};
