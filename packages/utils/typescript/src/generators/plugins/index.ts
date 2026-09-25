const PLUGINS_OPT_IN = `/*
 * Opts the application into the type contracts of the plugins bundled with Strapi.
 * Generated because \`typescript.strictTypes\` is enabled; disabling it removes this file.
 */
import type {} from '@strapi/strapi/plugins';
`;

/**
 * Generate the opt-in to the type contracts of the plugins bundled with Strapi
 *
 * The contracts are declared by the plugins themselves and reached through the type-only
 * `@strapi/strapi/plugins` entry, so the application does not need the plugins as direct
 * dependencies. Importing that entry anywhere in the program opts the whole program in.
 */
export const generatePluginsDefinitions = async () => {
  return { output: PLUGINS_OPT_IN, stats: {} };
};
