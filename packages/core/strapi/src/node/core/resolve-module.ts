import path from 'node:path';
import readPkgUp from 'read-pkg-up';

/**
 * Resolve module to package root for use in aliases.
 * Ensures pnpm's strict node_modules structure can resolve packages when bundling plugin chunks.
 *
 * @internal
 */
export const getModulePath = (mod: string): string => {
  const modulePath = require.resolve(mod);
  const pkg = readPkgUp.sync({ cwd: path.dirname(modulePath) });
  return pkg ? path.dirname(pkg.path) : modulePath;
};
