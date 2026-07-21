import path from 'node:path';
import readPkgUp from 'read-pkg-up';
import resolveFrom from 'resolve-from';

const pkgDirCache = new Map<string, string>();

/**
 * Package root of an installed package (cached), resolved from this process.
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
 * Resolve a module to its package root from a host package's dependency context.
 * Ensures pnpm's strict node_modules structure can resolve packages when bundling
 * plugin chunks, and lets callers pin a module to whichever package actually owns it
 * (e.g. CodeMirror from @strapi/design-system's closure).
 *
 * @internal
 */
export const getModulePathFrom = (hostPackage: string, mod: string): string => {
  const modulePath = resolveFrom(getPackageDir(hostPackage), mod);
  const pkg = readPkgUp.sync({ cwd: path.dirname(modulePath) });
  return pkg ? path.dirname(pkg.path) : modulePath;
};

/**
 * Resolve a module to its package root from @strapi/admin's closure.
 *
 * Admin Vite/webpack aliases must resolve from here so pnpm workspaces cannot pick up
 * a hoisted incompatible major from another package (e.g. @reduxjs/toolkit@2.x elsewhere
 * while admin pins 1.9.x).
 *
 * @internal
 */
export const getModulePath = (mod: string): string => getModulePathFrom('@strapi/admin', mod);
