import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

/**
 * Reads and validates the `typescript.strictTypes` flag.
 * false/undefined => legacy behaviour (only content-type and component definitions are generated),
 * true => also generate the application service, controller, policy and middleware contracts, the
 * bundled plugins opt-in and the optional plugins contracts.
 * Mirrors the validation of `api.documents.strictRelations` (see document-service/entries.ts).
 */
export const isStrictTypesEnabled = (strapi: Core.Strapi): boolean => {
  const rawStrictTypes: unknown = strapi.config.get('typescript.strictTypes', undefined);

  if (rawStrictTypes !== undefined && rawStrictTypes !== false && rawStrictTypes !== true) {
    throw new errors.ValidationError(
      `Invalid config.typescript.strictTypes value: ${JSON.stringify(rawStrictTypes)}. Expected boolean (true or false).`
    );
  }

  return rawStrictTypes === true;
};

/**
 * Type artifacts to generate for the application.
 *
 * With the flag off, the output equals the legacy one: only content-type and component definitions.
 * `plugins` loads the contracts of enabled optional plugins, so it is generated with the strict
 * artifacts. They are passed as `false` rather than left out when the flag is off, so the generator
 * removes a stale `plugins.d.ts` / `services.ts` / `controllers.ts` / `policies.ts` /
 * `middlewares.ts` / `strict.d.ts` left by a run with the flag on.
 */
export const getTypeArtifacts = (strapi: Core.Strapi) => {
  const strict = isStrictTypesEnabled(strapi);

  return {
    contentTypes: true,
    components: true,
    plugins: strict,
    services: strict,
    controllers: strict,
    policies: strict,
    middlewares: strict,
    strict,
  };
};

type TypeGenerators = Pick<
  (typeof import('@strapi/typescript-utils'))['generators'],
  'generate' | 'getStrictProgramWarning'
>;

/**
 * Generates the application types without the generator's own output, as `strapi develop` does
 * behind its spinner, and returns the warning the generator would have printed when
 * `typescript.strictTypes` is on and the application program leaves the strict files out, for the
 * caller to print with its own logger. A warning, never a failure.
 */
export const generateTypesSilently = async ({
  strapi,
  cwd,
  tsUtils,
}: {
  strapi: Core.Strapi;
  cwd: string;
  tsUtils: { generators: TypeGenerators };
}): Promise<string | undefined> => {
  const artifacts = getTypeArtifacts(strapi);

  // TODO @Nico a failed generation also returns: the warning may then list files it did not write
  await tsUtils.generators.generate({
    strapi,
    pwd: cwd,
    rootDir: undefined,
    logger: { silent: true, debug: false },
    artifacts,
  });

  return tsUtils.generators.getStrictProgramWarning({ pwd: cwd, rootDir: undefined, artifacts });
};
