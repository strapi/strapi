import { randomUUID } from 'node:crypto';
import * as z from 'zod/v4';

import type { Core } from '@strapi/types';
import type { OpenAPIV3_1 } from 'openapi-types';

/**
 * OpenAPI 3.1 uses the JSON Schema 2020-12 dialect. Zod 4.4.3 has no `openapi-3.1`
 * target, so `draft-2020-12` preserves valid 3.1 schemas. Explicit output mode preserves
 * the conversion direction used before these defaults were pinned.
 */
export const OPENAPI_SCHEMA_CONVERSION_OPTIONS = {
  target: 'draft-2020-12',
  io: 'output',
} as const satisfies Pick<z.core.RegistryToJSONSchemaParams, 'target' | 'io'>;

const ZOD_SHARED_BUCKET = '__shared';

/**
 * Zod 4.4.3 emits `#/components/schemas/__shared#/$defs/<id>` (and close variants)
 * when an identified nested schema is missing from the conversion registry.
 */
const ZOD_SHARED_REF_RE = /^#\/components\/schemas\/__shared#?\/(?:\$defs|definitions)\/(.+)$/;

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && Array.isArray(value) === false;
};

/**
 * Zod 4.4.3 embeds `$id` in registry `toJSONSchema` output when `uri` is configured.
 * Strip it so OpenAPI documents stay stable — inline schemas use random UUIDs
 * as registry IDs.
 */
export const stripJsonSchemaId = <T extends object>(schema: T): T => {
  if ('$id' in schema) {
    delete (schema as { $id?: string }).$id;
  }
  return schema;
};

/**
 * Generates a path string for referencing a component schema by its identifier.
 *
 * @param id - The identifier of the component schema.
 * @returns The constructed path string for the specified component schema.
 */
export const toComponentsPath = (id: string) => `#/components/schemas/${id}`;

const rewriteZodSharedRef = (ref: string): string => {
  const match = ZOD_SHARED_REF_RE.exec(ref);
  const id = match?.[1];

  if (id === undefined || id.length === 0) {
    return ref;
  }

  return toComponentsPath(id);
};

const rewriteZodSharedRefs = (value: unknown, seen: WeakSet<object> = new WeakSet()): void => {
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    for (const item of value) {
      rewriteZodSharedRefs(item, seen);
    }
    return;
  }

  if (isPlainObject(value) === false) {
    return;
  }

  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  const ref = value.$ref;
  if (typeof ref === 'string') {
    value.$ref = rewriteZodSharedRef(ref);
  }

  for (const nested of Object.values(value)) {
    rewriteZodSharedRefs(nested, seen);
  }
};

/**
 * Moves Zod's sibling `__shared` bucket into named component schemas and rewrites
 * `$ref`s that targeted that bucket.
 *
 * Zod 4.4.3 emits `#/components/schemas/__shared#/$defs/<id>` when an identified
 * nested schema is not in the conversion registry. Those definitions must become
 * first-class `components.schemas` entries; `__shared` is never written out.
 *
 * @returns Named schemas lifted from `__shared` (after `$id` stripping). Route
 *   conversion copies these into the shared harvest bag so ComponentsWriter can
 *   merge them into the document.
 */
export const liftZodSharedDefinitions = (
  schemas: Record<string, unknown>
): Record<string, OpenAPIV3_1.SchemaObject> => {
  const harvested: Record<string, OpenAPIV3_1.SchemaObject> = {};
  const shared = schemas[ZOD_SHARED_BUCKET];

  if (isPlainObject(shared)) {
    const defs = shared.$defs ?? shared.definitions;

    if (isPlainObject(defs)) {
      for (const [id, def] of Object.entries(defs)) {
        if (isPlainObject(def) === false) {
          continue;
        }

        const cleaned = stripJsonSchemaId(def) as OpenAPIV3_1.SchemaObject;
        harvested[id] = cleaned;

        if (schemas[id] === undefined) {
          schemas[id] = cleaned;
        }
      }
    }

    delete schemas[ZOD_SHARED_BUCKET];
  }

  const seen = new WeakSet<object>();
  rewriteZodSharedRefs(schemas, seen);
  rewriteZodSharedRefs(harvested, seen);

  for (const schema of Object.values(schemas)) {
    if (isPlainObject(schema)) {
      stripJsonSchemaId(schema);
    }
  }

  return harvested;
};

export type ZodToOpenAPIOptions = {
  /**
   * Shared harvest bag filled with named schemas lifted from Zod's `__shared`
   * bucket. Assemblers pass `context.registries.extractedComponentSchemas` so
   * ComponentsWriter can merge them into `components.schemas`.
   */
  extractedComponentSchemas?: Record<string, OpenAPIV3_1.SchemaObject>;
};

/**
 * Converts a Zod schema to an OpenAPI Schema Object.
 *
 * @description
 * Takes a Zod schema and converts it into an OpenAPI Schema Object (v3.1).
 * It uses a local registry to handle the conversion process and generates the appropriate
 * OpenAPI components. Identified nested schemas that Zod would otherwise park in
 * `__shared` are rewritten to `#/components/schemas/<id>` and copied into
 * `options.extractedComponentSchemas` when that bag is provided.
 *
 * @param zodSchema - The Zod schema to convert to OpenAPI format. Can be any valid Zod schema.
 * @param schemaStore - The application-owned content-API schema store to copy named
 *   component definitions from. Conversion uses a local registry and does not read a
 *   live Zod registry from the store.
 * @param options - Optional harvest bag shared across assemblers and ComponentsWriter.
 *
 * @returns An OpenAPI Schema Object representing the input Zod schema structure.
 * If the conversion cannot be completed, returns undefined.
 *
 * @example
 * ```typescript
 * import * as z from 'zod/v4';
 *
 * // Create a Zod schema
 * const userSchema = z.object({
 *   id: z.number(),
 *   name: z.string(),
 *   email: z.string().email()
 * });
 *
 * // Convert to OpenAPI schema
 * const openAPISchema = zodToOpenAPI(userSchema, strapi.contentAPISchemaRegistry);
 * ```
 */
export const zodToOpenAPI = (
  zodSchema: z.ZodType,
  schemaStore: Core.ContentAPISchemaRegistry,
  options?: ZodToOpenAPIOptions
): OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject => {
  try {
    const id = randomUUID();
    const registry = z.registry<{ id: string }>();

    // Add the schema to the local registry with a custom, unique ID
    registry.add(zodSchema, { id });

    // Copy Strapi-owned definitions into the local registry so references resolve without
    // generating "__shared" definitions.
    for (const [key, value] of schemaStore.entries()) {
      registry.add(value, { id: key });
    }

    // Generate the schemas and only return the one we want, transform the URI path to be OpenAPI compliant
    const { schemas } = z.toJSONSchema(registry, {
      ...OPENAPI_SCHEMA_CONVERSION_OPTIONS,
      uri: toComponentsPath,
    });

    const harvested = isPlainObject(schemas) ? liftZodSharedDefinitions(schemas) : {};

    if (options?.extractedComponentSchemas !== undefined) {
      Object.assign(options.extractedComponentSchemas, harvested);
    }

    // TODO: make sure it's compliant
    return stripJsonSchemaId(schemas[id] as OpenAPIV3_1.SchemaObject);
  } catch {
    throw new Error("Couldn't transform the zod schema into an OpenAPI schema");
  }
};
