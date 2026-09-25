import { errors } from '@strapi/utils';
import type { Core } from '@strapi/types';

/**
 * Reads and validates the `typescript.strictTypes` flag.
 * false/undefined => legacy behaviour (only content-type and component definitions are generated),
 * true => also generate the application service contracts and the bundled plugins opt-in.
 * Mirrors the validation of `api.documents.strictRelations` (see document-service/entries.ts).
 */
export const isStrictTypesEnabled = (strapi: Core.Strapi): boolean => {
  const rawStrictTypes: unknown = strapi.config.get('typescript.strictTypes', undefined);

  if (rawStrictTypes !== undefined && rawStrictTypes !== false && rawStrictTypes !== true) {
    throw new errors.ValidationError(
      `Invalid config.typescript.strictTypes value: "${rawStrictTypes}". Expected boolean (true or false).`
    );
  }

  return rawStrictTypes === true;
};

/**
 * Type artifacts to generate for the application.
 *
 * The strict artifacts are passed as `false` rather than left out when the flag is off, so the
 * generator removes a stale `services.d.ts` / `plugins.d.ts` left by a run with the flag on.
 */
export const getTypeArtifacts = (strapi: Core.Strapi) => {
  const strict = isStrictTypesEnabled(strapi);

  return { contentTypes: true, components: true, services: strict, plugins: strict };
};
