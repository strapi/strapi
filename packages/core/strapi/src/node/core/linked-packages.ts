import path from 'node:path';
import { createRequire } from 'node:module';
import readPkgUp from 'read-pkg-up';

/**
 * Detects if @strapi/design-system is linked (portal:, file:, or yarn link).
 * Returns the package root path when linked, null otherwise.
 */
export const getLinkedDesignSystemPath = (cwd: string): string | null => {
  try {
    const require = createRequire(import.meta.url);
    const resolvedPath = require.resolve('@strapi/design-system');
    const pkg = readPkgUp.sync({ cwd: path.dirname(resolvedPath) });
    if (!pkg) return null;
    const pkgRoot = path.dirname(pkg.path);
    const relativePath = path.relative(cwd, pkgRoot);
    const isLinked = relativePath.startsWith('..') || path.isAbsolute(relativePath);
    return isLinked ? pkgRoot : null;
  } catch {
    return null;
  }
};

export const isDesignSystemLinked = (cwd: string): boolean =>
  getLinkedDesignSystemPath(cwd) !== null;
