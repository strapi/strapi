import path from 'node:path';
import { getModulePath } from './resolve-module';

const DESIGN_SYSTEM_MODULE = '@strapi/design-system';

/**
 * Detect if a package is locally linked (portal:, file:, yarn link) rather than installed in node_modules.
 * When linked, the resolved path is outside node_modules.
 *
 * @internal
 */
export const isPackageLinked = (mod: string): boolean => {
  const pkgRoot = getModulePath(mod);
  const pathSegments = pkgRoot.split(path.sep);
  return !pathSegments.includes('node_modules');
};

/**
 * Detects if @strapi/design-system is linked (portal:, file:, or yarn link).
 * Returns the package root path when linked, null otherwise.
 * Uses the heuristic: linked packages resolve outside node_modules.
 */
export const getLinkedDesignSystemPath = (): string | null => {
  try {
    const pkgRoot = getModulePath(DESIGN_SYSTEM_MODULE);
    return isPackageLinked(DESIGN_SYSTEM_MODULE) ? pkgRoot : null;
  } catch {
    return null;
  }
};

export const isDesignSystemLinked = (): boolean => getLinkedDesignSystemPath() !== null;
