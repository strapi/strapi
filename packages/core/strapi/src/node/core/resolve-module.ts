import path from 'node:path';
import readPkgUp from 'read-pkg-up';
import resolveFrom from 'resolve-from';

const pkgDirCache = new Map<string, string>();

/**
 * Package root of a workspace / installed package (cached).
 */
const getPackageDir = (packageName: string): string => {
  const cached = pkgDirCache.get(packageName);
  if (cached) {
    return cached;
  }

  const dir = path.dirname(require.resolve(`${packageName}/package.json`));
  pkgDirCache.set(packageName, dir);
  return dir;
};

/**
 * Resolve module to package root from a host package's dependency context.
 * Ensures pnpm's strict node_modules structure can resolve packages when bundling plugin chunks.
 *
 * @internal
 */
export const getModulePathFrom = (hostPackage: string, mod: string): string => {
  const modulePath = resolveFrom(getPackageDir(hostPackage), mod);
  const pkg = readPkgUp.sync({ cwd: path.dirname(modulePath) });
  return pkg ? path.dirname(pkg.path) : modulePath;
};

/**
 * Resolve module to package root from @strapi/admin's closure.
 * Prefer this for admin-pinned aliases so pnpm workspaces cannot pick up a hoisted
 * incompatible major (e.g. @reduxjs/toolkit@2.x elsewhere while admin pins 1.9.x).
 *
 * @internal
 */
export const getModulePath = (mod: string): string => getModulePathFrom('@strapi/admin', mod);
