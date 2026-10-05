import * as ts from 'typescript';

import {
  collectAppSources,
  emitRegistryDefinitions,
  filterRegisteredSources,
  generateInstanceHelperDefinition,
  typeofImport,
} from '../common/sources';
import type { GeneratorOptions } from '../utils';

const { factory } = ts;

const REGISTRY = 'AppServices';
const INSTANCE_HELPER = 'ServiceInstance';

const NO_SERVICE_PLACEHOLDER_COMMENT = `/*
 * The app doesn't have any services yet.
 */
`;

/**
 * Generate type definitions for the application's services (api::*)
 *
 * Services are typed from their source file, so only the ones with a source in src/api are emitted.
 * Plugin and admin services are left to the packages themselves (Strapi.Registries.PackageServices).
 *
 * declare global {
 *   namespace Strapi {
 *     namespace Registries {
 *       interface AppServices {
 *         'api::<api>.<service>': ServiceInstance<typeof import('<relative path to the source>')>;
 *       }
 *     }
 *   }
 * }
 */
export const generateServicesDefinitions = async (
  options: GeneratorOptions = {} as GeneratorOptions
) => {
  const { strapi, logger, pwd: outDir } = options;

  if (!outDir) {
    throw new Error('The services generator needs the output directory to resolve source imports');
  }

  const sources = await collectAppSources('services', { api: strapi.dirs.app.api }, outDir, logger);
  const servicesDefinitions = filterRegisteredSources(sources, strapi.services, logger);

  logger.debug(`Found ${servicesDefinitions.length} services.`);

  if (servicesDefinitions.length === 0) {
    return { output: NO_SERVICE_PLACEHOLDER_COMMENT, stats: {} };
  }

  const output = await emitRegistryDefinitions(
    REGISTRY,
    [
      generateInstanceHelperDefinition(
        INSTANCE_HELPER,
        '*\n * Type of the service instance exposed by a service module: the return type of its default\n * export when it is a factory, the default export itself otherwise.\n '
      ),
    ],
    servicesDefinitions,
    (source) => factory.createTypeReferenceNode(INSTANCE_HELPER, [typeofImport(source)])
  );

  return { output, stats: {} };
};
