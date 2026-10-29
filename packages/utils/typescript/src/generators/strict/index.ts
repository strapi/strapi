import type { GeneratorOptions } from '../utils';

const STRICT_OPT_IN = `/*
 * Opts the application into registered server contracts
 * Generated because \`typescript.strictTypes\` is enabled; disabling it removes this file.
 */
import type {} from '@strapi/strapi/strict-types';
`;

/**
 * Reads `typescript.licensedFeatures`, the license gates the application builds against. Unset lists
 * none. Names are not checked against the license inventory: `Core.Config.TypeScript` types the key.
 */
const readLicensedFeatures = (strapi: GeneratorOptions['strapi']): string[] => {
  const value: unknown = strapi.config.get('typescript.licensedFeatures', undefined);

  if (value === undefined) {
    return [];
  }

  if (Array.isArray(value) === false || value.some((name) => typeof name !== 'string') === true) {
    throw new Error(
      `Invalid config.typescript.licensedFeatures value: ${JSON.stringify(value)}. Expected an array of license feature names.`
    );
  }

  return [...new Set<string>(value)];
};

/**
 * The application's license scope: `Settings.licenses: 'declared'` and the listed gates, so that
 * license-gated contracts (`Core.Licensed`) follow `typescript.licensedFeatures` rather than the
 * license type generation runs with.
 */
const licenseScope = (licensedFeatures: string[]) => {
  const entries = licensedFeatures
    .map((name) => `\n        ${JSON.stringify(name)}: true;`)
    .join('');
  const closing = entries === '' ? '' : '\n      ';

  return `
/*
 * License-gated contracts follow \`typescript.licensedFeatures\`: those of a listed feature are
 * typed as registered, the others as \`undefined\`. List the features of the license the
 * application boots with.
 */
declare global {
  namespace Strapi {
    namespace Registries {
      interface Settings {
        licenses: 'declared';
      }

      interface LicensedFeatures {${entries}${closing}}
    }
  }
}
`;
};

/**
 * Generate the opt-in to registered server contracts
 *
 * `@strapi/strapi/strict-types` enables strict lookups for the whole program and loads the contracts
 * of the plugins bundled with Strapi; optional plugins are loaded by the `plugins` artifact. Going
 * through `@strapi/strapi` keeps the application free of direct dependencies on the plugins, which
 * it cannot resolve under a strict package manager layout.
 *
 * The file also declares the application's license scope. Only type generation writes it: a
 * published entry point, `@strapi/strapi/strict-types` included, would apply it to every program
 * that loads it, plugins included.
 */
export const generateStrictDefinitions = async (options: Pick<GeneratorOptions, 'strapi'>) => {
  const output = `${STRICT_OPT_IN}${licenseScope(readLicensedFeatures(options.strapi))}`;

  return { output, stats: {} };
};
