/**
 * Modules that must resolve to a single runtime instance in the admin bundle.
 *
 * CodeMirror extensions rely on `instanceof` checks internally, so the JSON custom
 * field (JSONInput) crashes if @codemirror/state (or its siblings) is duplicated
 * between @strapi/design-system, @codemirror/lang-json and @uiw/react-codemirror
 * They are resolved from @strapi/design-system's closure — the real
 * consumer that also externalizes them — and forced onto a single copy.
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
