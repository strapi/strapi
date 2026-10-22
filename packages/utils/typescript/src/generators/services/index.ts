import {
  collectAppSources,
  emitRegistryDefinitions,
  filterRegisteredSources,
  findTypeExports,
  generateContractHelperDefinition,
  generateInstanceHelperDefinition,
  instanceTypeOf,
  isInferredSource,
} from '../common/sources';
import type { GeneratorOptions } from '../utils';

const REGISTRY = 'AppServices';
const INSTANCE_HELPER = 'ServiceInstance';
const CONTRACT_EXPORT = 'ServiceContract';
const CONTRACT_HELPER = 'ServiceContractOf';
const INFERRED_REGISTRY = 'InferredServices';

const NO_SERVICE_PLACEHOLDER_COMMENT = `/*
 * The app doesn't have any services yet.
 */

export {};
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
 *         'api::<api>.<service>': ServiceContractOf<import('<relative path to the source>').ServiceContract>;
 *       }
 *       interface InferredServices {
 *         'api::<api>.<service>': true;
 *       }
 *     }
 *   }
 * }
 *
 * A service whose module exports a `ServiceContract` type registers that contract; any other service
 * registers the type its default export provides. A JS source registers as `unknown`: without
 * `allowJs` its import is an error type. So do a service module, a default export and a contract
 * typed `any`.
 *
 * `InferredServices` lists the TypeScript services registered without a contract, whose type is read
 * from the factory itself: `Core.ServiceFactory` rejects their uid. It is not emitted when there are
 * none.
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

  const contract = {
    exportName: CONTRACT_EXPORT,
    helper: CONTRACT_HELPER,
    uids: await findTypeExports(servicesDefinitions, CONTRACT_EXPORT, logger),
  };

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
      ...(contract.uids.size > 0
        ? [
            generateContractHelperDefinition(
              CONTRACT_HELPER,
              '*\n * Contract a service module exports as `ServiceContract`, `unknown` when it is typed `any`.\n '
            ),
          ]
        : []),
    ],
    servicesDefinitions,
    instanceTypeOf(INSTANCE_HELPER, logger, contract),
    [
      {
        registry: INFERRED_REGISTRY,
        uids: servicesDefinitions.filter(isInferredSource(contract)).map(({ uid }) => uid),
      },
    ]
  );

  return { output, stats: {} };
};
