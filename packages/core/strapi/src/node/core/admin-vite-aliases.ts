import { ADMIN_VITE_ALIAS_MODULES, ADMIN_VITE_SINGLETON_MODULES } from './admin-vite-alias-modules';
import { getModulePath, getModulePathFrom } from './resolve-module';

/**
 * Vite resolve.alias entries for the admin bundle.
 *
 * @internal
 */
export const buildAdminViteResolveAliases = (): Record<string, string> =>
  Object.fromEntries([
    ...ADMIN_VITE_ALIAS_MODULES.map((mod) => [mod, getModulePath(mod)] as const),
    ...ADMIN_VITE_SINGLETON_MODULES.map(
      (mod) => [mod, getModulePathFrom('@strapi/design-system', mod)] as const
    ),
  ]);
