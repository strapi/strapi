/**
 * Modules that must resolve to a single runtime instance in the admin Vite graph.
 *
 * CodeMirror extensions use instanceof checks internally, so JSONInput breaks if
 * @codemirror/state is duplicated between @strapi/design-system and lang-json/uiw.
 *
 * @internal
 */
export const ADMIN_VITE_SINGLETON_MODULES = [
  '@codemirror/state',
  '@codemirror/view',
  '@codemirror/language',
  '@codemirror/lang-json',
  '@codemirror/commands',
  '@codemirror/lint',
  '@uiw/react-codemirror',
] as const;

export type AdminViteSingletonModule = (typeof ADMIN_VITE_SINGLETON_MODULES)[number];
