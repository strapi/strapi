import path from 'path';

import fse from 'fs-extra';

/**
 * Discover user migration files in a directory.
 * Matches umzug's non-recursive `*.{js,sql}` glob with alphabetical ordering.
 */
export const discoverMigrationFiles = (dir: string): string[] => {
  if (!fse.existsSync(dir)) {
    return [];
  }

  return fse
    .readdirSync(dir)
    .filter((file) => file.endsWith('.js') || file.endsWith('.sql'))
    .map((file) => path.resolve(dir, file))
    .sort();
};
