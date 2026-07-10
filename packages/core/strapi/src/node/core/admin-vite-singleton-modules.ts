/**
 * Singleton modules that must resolve to a single instance in the admin Vite graph.
 * Extends {@link ADMIN_VITE_ALIAS_MODULES} with packages that break when duplicated
 * (CodeMirror, etc.) — see strapi/strapi#26951.
 */
export const ADMIN_VITE_SINGLETON_MODULES = [
  '@codemirror/state',
  '@codemirror/view',
  '@uiw/react-codemirror',
] as const;

export type AdminViteSingletonModule = (typeof ADMIN_VITE_SINGLETON_MODULES)[number];
