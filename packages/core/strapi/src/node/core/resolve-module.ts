import path from 'node:path';
import readPkgUp from 'read-pkg-up';
import resolveFrom from 'resolve-from';

let adminPkgDir: string | undefined;

/**
 * Package root of @strapi/admin — admin Vite aliases must resolve from here so pnpm
 * workspaces cannot pick up a hoisted incompatible major from another package
 * (e.g. @reduxjs/toolkit@2.x elsewhere while admin pins 1.9.x).
 */
const getAdminPkgDir = (): string => {
  if (!adminPkgDir) {
    adminPkgDir = path.dirname(require.resolve('@strapi/admin/package.json'));
  }

  return adminPkgDir;
};

/**
 * Resolve module to package root for use in aliases.
 * Ensures pnpm's strict node_modules structure can resolve packages when bundling plugin chunks.
 *
 * @internal
 */
export const getModulePath = (mod: string): string => {
  const modulePath = resolveFrom(getAdminPkgDir(), mod);
  const pkg = readPkgUp.sync({ cwd: path.dirname(modulePath) });
  return pkg ? path.dirname(pkg.path) : modulePath;
};
