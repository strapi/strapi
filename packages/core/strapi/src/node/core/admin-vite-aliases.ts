import { ADMIN_VITE_ALIAS_MODULES } from './admin-vite-alias-modules';
import { getModulePath } from './resolve-module';

/**
 * Vite resolve.alias entries for the admin bundle — every path comes from @strapi/admin's closure.
 *
 * @internal
 */
export const buildAdminViteResolveAliases = (): Record<string, string> =>
  Object.fromEntries(ADMIN_VITE_ALIAS_MODULES.map((mod) => [mod, getModulePath(mod)]));
