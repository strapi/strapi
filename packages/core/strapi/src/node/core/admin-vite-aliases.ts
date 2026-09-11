import { ADMIN_VITE_ALIAS_MODULES, ADMIN_VITE_SINGLETON_MODULES } from './admin-vite-alias-modules';
import { getModulePath, getModulePathFrom } from './resolve-module';

/**
 * Vite resolve.alias entries for the admin bundle.
 *
 * Admin alias modules resolve from @strapi/admin's closure. CodeMirror singletons resolve
 * from @strapi/design-system's closure (the real consumer), tolerantly: optional/transitive
 * CodeMirror packages that cannot be resolved are skipped rather than crashing the build
 *
 * @internal
 */
export const buildAdminViteResolveAliases = (): Record<string, string> =>
  Object.fromEntries([
    ...ADMIN_VITE_ALIAS_MODULES.map((mod) => [mod, getModulePath(mod)] as const),
    ...buildSingletonAliasEntries(),
  ]);

/**
 * Resolve the CodeMirror singleton aliases from @strapi/design-system's closure, skipping any
 * package that cannot be resolved (e.g. optional or transitive CodeMirror packages not installed).
 *
 * @internal
 */
export const buildSingletonAliasEntries = (): Array<readonly [string, string]> => {
  const entries: Array<readonly [string, string]> = [];

  for (const mod of ADMIN_VITE_SINGLETON_MODULES) {
    try {
      entries.push([mod, getModulePathFrom('@strapi/design-system', mod)] as const);
    } catch {
      // Optional/transitive CodeMirror package not resolvable here — skip it rather than
      // throwing, so a missing singleton never breaks the admin build.
    }
  }

  return entries;
};

/**
 * Names of the CodeMirror singletons that actually resolve from @strapi/design-system's closure.
 *
 * Mirrors buildSingletonAliasEntries so optimizeDeps.include stays in lockstep with resolve.alias:
 * a singleton that cannot be aliased must not be forced into pre-bundling either, or Vite chokes
 * on an unresolvable optimizeDeps.include entry.
 *
 * @internal
 */
export const getResolvableSingletonModules = (): string[] =>
  buildSingletonAliasEntries().map(([mod]) => mod);
