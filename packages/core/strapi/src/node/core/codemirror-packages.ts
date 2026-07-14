import { getModulePath } from './resolve-module';

/**
 * CodeMirror extension identity relies on instanceof checks in @codemirror/state.
 * These packages must resolve to a single instance at runtime — the same constraint
 * as React and @strapi/design-system (see vite/webpack config resolve.dedupe).
 *
 * @strapi/design-system externalizes CodeMirror when building JSONInput. Without
 * deduplication, Vite can pre-bundle separate copies via @uiw/react-codemirror and
 * @codemirror/*, breaking extension registration in the admin panel.
 */
export const CODEMIRROR_SINGLETON_PACKAGES = [
  '@codemirror/state',
  '@codemirror/view',
  '@codemirror/language',
  '@codemirror/lang-json',
  '@codemirror/commands',
  '@codemirror/lint',
  '@uiw/react-codemirror',
] as const;

export const getCodemirrorAliases = (): Record<string, string> => {
  return CODEMIRROR_SINGLETON_PACKAGES.reduce<Record<string, string>>((aliases, pkg) => {
    try {
      aliases[pkg] = getModulePath(pkg);
    } catch {
      // Transitive dependency may not be installed in all contexts
    }

    return aliases;
  }, {});
};

export const getResolvableCodemirrorPackages = (): string[] => {
  return Object.keys(getCodemirrorAliases());
};
