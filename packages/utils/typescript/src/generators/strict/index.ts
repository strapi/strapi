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
 * The license gates of the license that verified at boot: `'licensed'` and its features, none in CE.
 * Reads `strapi.ee` as the runtime does. `undefined` when the instance has no `strapi.ee`.
 */
const readBootLicenseGates = (strapi: GeneratorOptions['strapi']): Set<string> | undefined => {
  if (strapi.ee === undefined) {
    return undefined;
  }

  if (strapi.ee.isEE !== true) {
    return new Set();
  }

  const features: Array<{ name: string }> = strapi.ee.features.list();

  return new Set(['licensed', ...features.map((feature) => feature.name)]);
};

/**
 * Warns when `typescript.licensedFeatures` and the license that verified at boot disagree: the
 * generated types follow the config, the registered contracts follow the license. Never changes the
 * output nor fails the generation.
 */
const warnOnLicenseMismatch = (
  strapi: GeneratorOptions['strapi'],
  logger: GeneratorOptions['logger'],
  licensedFeatures: string[]
) => {
  const bootGates = readBootLicenseGates(strapi);

  if (bootGates === undefined) {
    return;
  }

  // Every listed feature implies `'licensed'`
  const declaredGates = new Set(licensedFeatures);
  if (licensedFeatures.length > 0) {
    declaredGates.add('licensed');
  }

  const undeclared = [...bootGates].filter((gate) => declaredGates.has(gate) === false);
  const unlicensed = licensedFeatures.filter((gate) => bootGates.has(gate) === false);

  if (undeclared.length > 0) {
    logger.warn(
      `The license Strapi booted with includes license features that config.typescript.licensedFeatures does not list: ${undeclared.join(', ')}. Their license-gated contracts are typed as \`undefined\`. Add them to config.typescript.licensedFeatures.`
    );
  }

  if (unlicensed.length > 0) {
    logger.warn(
      `config.typescript.licensedFeatures lists license features that the license Strapi booted with does not include: ${unlicensed.join(', ')}. Their license-gated contracts are typed as registered but are \`undefined\` at runtime.`
    );
  }
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
 * that loads it, plugins included. The scope follows the config; a license that disagrees only logs
 * warnings.
 */
export const generateStrictDefinitions = async (
  options: Pick<GeneratorOptions, 'strapi' | 'logger'>
) => {
  const licensedFeatures = readLicensedFeatures(options.strapi);
  warnOnLicenseMismatch(options.strapi, options.logger, licensedFeatures);

  const output = `${STRICT_OPT_IN}${licenseScope(licensedFeatures)}`;

  return { output, stats: {} };
};
