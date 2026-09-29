const STRICT_OPT_IN = `/*
 * Opts the application into registered server contracts: service, controller, config and policy
 * lookups resolve to the contracts declared by Strapi, plugins and this application.
 * Generated because \`typescript.strictTypes\` is enabled; disabling it removes this file.
 */
import type {} from '@strapi/strapi/strict-types';
`;

/**
 * Generate the opt-in to registered server contracts
 *
 * `@strapi/strapi/strict-types` enables strict lookups for the whole program and loads the contracts
 * of the plugins bundled with Strapi; optional plugins are loaded by the `plugins` artifact. Going
 * through `@strapi/strapi` keeps the application free of direct dependencies on the plugins, which
 * it cannot resolve under a strict package manager layout.
 */
export const generateStrictDefinitions = async () => {
  return { output: STRICT_OPT_IN, stats: {} };
};
