import path from 'path';

import fse from 'fs-extra';

/**
 * Discover user migration files in a directory.
 * Matches umzug's non-recursive `*.{js,sql}` glob (fast-glob defaults:
 * `dot: false`, `onlyFiles: true`, `followSymbolicLinks: true`) with
 * alphabetical ordering.
 */
export const discoverMigrationFiles = (dir: string): string[] => {
  if (!fse.existsSync(dir)) {
    return [];
  }

  return fse
    .readdirSync(dir, { withFileTypes: true })
    .filter((entry) => {
      if (entry.name.startsWith('.')) {
        return false;
      }

      if (!entry.name.endsWith('.js') && !entry.name.endsWith('.sql')) {
        return false;
      }

      // Regular files: accept without stat so a TOCTOU race (file removed
      // between readdir and stat) surfaces later instead of being swallowed.
      if (entry.isFile()) {
        return true;
      }

      // Dirent#isFile() is false for symlinks; only then follow the target
      // (umzug/fast-glob followSymbolicLinks: include symlink→file, skip
      // symlink→directory and broken links).
      if (entry.isSymbolicLink()) {
        try {
          return fse.statSync(path.join(dir, entry.name)).isFile();
        } catch {
          return false;
        }
      }

      return false;
    })
    .map((entry) => path.resolve(dir, entry.name))
    .sort();
};
