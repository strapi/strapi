import {
  collectAppSources,
  emitRegistryDefinitions,
  filterRegisteredSources,
  findTypeExports,
  generateContractHelperDefinition,
  generateInstanceHelperDefinition,
  instanceTypeOf,
  isInferredSource,
  scanSources,
} from '../common/sources';
import type { GeneratorOptions } from '../utils';

const REGISTRY = 'AppControllers';
// Same helper as the services generator's ServiceInstance
const INSTANCE_HELPER = 'ControllerInstance';
const CONTRACT_EXPORT = 'ControllerContract';
const CONTRACT_HELPER = 'ControllerContractOf';
const INFERRED_REGISTRY = 'InferredControllers';

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
 *         'api::<api>.<controller>': ControllerContractOf<import('<relative path to the source>').ControllerContract>;
 *         'api::<api>.<export = controller>': ControllerInstance<{ default: typeof import('<relative path to the source>') }>;
 *         'api::<api>.<js commonjs controller>': ControllerInstance<{ default: typeof import('<relative path to the source>') }>;
 *         'api::<api>.<js controller without types, or commonjs controller>': unknown;
 *       }
 *       interface InferredControllers {
 *         'api::<api>.<controller>': true;
 *       }
 *     }
 *   }
 * }
 *
 * A controller whose module exports a `ControllerContract` type registers that contract; any other
 * controller registers the type its default export provides, or the value it assigns with
 * `export =`. A JS source is read from its sibling `<name>.d.ts`, else from the JS file itself with
 * `allowJs` (see `typesFileOf`). Without either, it registers as `unknown` without an import: its
 * import is an error type. So does a CommonJS-style TypeScript source (`module.exports = …`), whose
 * import fails (see `moduleTypeOf`). A controller module, a default export and a contract typed
 * `any` register `unknown` too.
 *
 * `InferredControllers` lists the controllers registered without a contract, whose type is read from
 * the factory itself: `Core.ControllerFactory` rejects their uid. It is not emitted when there are
 * none.
 */
export const generateControllersDefinitions = async (
  options: GeneratorOptions = {} as GeneratorOptions
) => {
  const { strapi, logger, pwd: outDir, allowJs } = options;

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
  const controllersDefinitions = await scanSources(
    filterRegisteredSources(sources, strapi.controllers, logger),
    logger,
    { allowJs }
  );

  logger.debug(`Found ${controllersDefinitions.length} controllers.`);

  const contract = {
    exportName: CONTRACT_EXPORT,
    helper: CONTRACT_HELPER,
    uids: findTypeExports(controllersDefinitions, CONTRACT_EXPORT, logger),
  };

  if (controllersDefinitions.length === 0) {
    return { output: NO_CONTROLLER_PLACEHOLDER_COMMENT, stats: {} };
  }

  const inferredUIDs = controllersDefinitions
    .filter(isInferredSource(contract))
    .map(({ uid }) => uid);

  // Each helper is only emitted when an entry reads it: `noUnusedLocals` reports an unused one
  const output = await emitRegistryDefinitions(
    REGISTRY,
    [
      ...(inferredUIDs.length > 0
        ? [
            generateInstanceHelperDefinition(
              INSTANCE_HELPER,
              '*\n * Type of the controller exposed by a controller module: the return type of its default export\n * when it is a factory, the default export itself otherwise.\n '
            ),
          ]
        : []),
      ...(contract.uids.size > 0
        ? [
            generateContractHelperDefinition(
              CONTRACT_HELPER,
              '*\n * Contract a controller module exports as `ControllerContract`, `unknown` when it is typed `any`.\n '
            ),
          ]
        : []),
    ],
    controllersDefinitions,
    instanceTypeOf(INSTANCE_HELPER, logger, contract),
    [
      {
        registry: INFERRED_REGISTRY,
        uids: inferredUIDs,
      },
    ]
  );

  return { output, stats: {} };
};
