import {
  collectAppSources,
  emitRegistryDefinitions,
  filterRegisteredSources,
  generateInstanceHelperDefinition,
  instanceTypeOf,
} from '../common/sources';
import type { GeneratorOptions } from '../utils';

const REGISTRY = 'AppControllers';
// Same helper as the services generator's ServiceInstance
const INSTANCE_HELPER = 'ControllerInstance';

const NO_CONTROLLER_PLACEHOLDER_COMMENT = `/*
 * The app doesn't have any controllers yet.
 */

export {};
`;

/**
 * Generate type definitions for the application's controllers (api::*)
 *
 * Controllers are typed from their source file, so only the ones with a source in src/api are emitted.
 * Plugin and admin controllers are left to the packages themselves (Strapi.Registries.PackageControllers).
 *
 * declare global {
 *   namespace Strapi {
 *     namespace Registries {
 *       interface AppControllers {
 *         'api::<api>.<controller>': ControllerInstance<typeof import('<relative path to the source>')>;
 *       }
 *     }
 *   }
 * }
 *
 * A JS source registers as `unknown`: without `allowJs` its import is an error type. So does a
 * controller module typed `any` or whose import no longer resolves.
 */
export const generateControllersDefinitions = async (
  options: GeneratorOptions = {} as GeneratorOptions
) => {
  const { strapi, logger, pwd: outDir } = options;

  if (!outDir) {
    throw new Error(
      'The controllers generator needs the output directory to resolve source imports'
    );
  }

  const sources = await collectAppSources(
    'controllers',
    { api: strapi.dirs.app.api },
    outDir,
    logger
  );
  const controllersDefinitions = filterRegisteredSources(sources, strapi.controllers, logger);

  logger.debug(`Found ${controllersDefinitions.length} controllers.`);

  if (controllersDefinitions.length === 0) {
    return { output: NO_CONTROLLER_PLACEHOLDER_COMMENT, stats: {} };
  }

  const output = await emitRegistryDefinitions(
    REGISTRY,
    [
      generateInstanceHelperDefinition(
        INSTANCE_HELPER,
        '*\n * Type of the controller exposed by a controller module: the return type of its default export\n * when it is a factory, the default export itself otherwise.\n '
      ),
    ],
    controllersDefinitions,
    instanceTypeOf(INSTANCE_HELPER, logger)
  );

  return { output, stats: {} };
};
