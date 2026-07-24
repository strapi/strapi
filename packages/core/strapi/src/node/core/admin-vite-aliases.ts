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
    ...buildYupCjsAliasEntries(),
  ]);

/**
 * CJS dependencies that yup's ESM build (`yup/es`) reaches through a *named* import
 * (e.g. `import { getter } from 'property-expr'`). If they are served raw instead of
 * pre-bundled, Vite cannot synthesize those named exports and the admin blank-crashes
 * with "does not provide an export named 'getter'" (#27062).
 *
 * @internal
 */
export const YUP_CJS_NAMED_EXPORT_MODULES = ['property-expr'] as const;

/**
 * Resolve yup's CJS named-export deps from yup's own closure (where they always live,
 * including under pnpm's strict layout), skipping any that cannot be resolved.
 *
 * @internal
 */
export const buildYupCjsAliasEntries = (): Array<readonly [string, string]> => {
  const entries: Array<readonly [string, string]> = [];

  for (const mod of YUP_CJS_NAMED_EXPORT_MODULES) {
    try {
      entries.push([mod, getModulePathFrom('yup', mod)] as const);
    } catch {
      // yup's CJS dep not resolvable here — skip rather than throwing, mirroring the
      // singleton handling, so a missing dep never breaks the admin build.
    }
  }

  return entries;
};

/**
 * Names of yup's CJS named-export deps that actually resolve from yup's closure.
 *
 * Mirrors buildYupCjsAliasEntries so optimizeDeps.include stays in lockstep with
 * resolve.alias: a dep that cannot be aliased must not be forced into pre-bundling
 * either, or Vite chokes on an unresolvable optimizeDeps.include entry.
 *
 * @internal
 */
export const getResolvableYupCjsModules = (): string[] =>
  buildYupCjsAliasEntries().map(([mod]) => mod);

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
