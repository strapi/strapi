import { transformUidToValidOpenApiName } from '@strapi/utils';
import type { Internal } from '@strapi/types';
import * as z from 'zod/v4';

/**
 * Safely adds or updates a schema in Zod's global registry.
 *
 * If a schema with the given `id` already exists, it will be removed before adding the new one.
 *
 * This is useful for hot-reloading or preventing issues with cyclical dependencies.
 *
 * @param id - The unique identifier for the schema in the global registry.
 * @param schema - The Zod schema to register.
 * @example
 * ```typescript
 * safeGlobalRegistrySet("mySchema", z.object({ name: z.string() }));
 * ```
 */
export const safeGlobalRegistrySet = (id: Internal.UID.Schema, schema: z.ZodType) => {
  const { _idmap: idMap } = z.globalRegistry;

  const transformedId = transformUidToValidOpenApiName(id);

  // Allow safe overrides in the ID map
  if (idMap.has(transformedId)) {
    idMap.delete(transformedId);
  }

  z.globalRegistry.add(schema, { id: transformedId });
};

/**
 * Safely creates and registers a Zod schema in the global registry, particularly useful for handling cyclical data structures.
 *
 * If a schema with the given `id` already exists in the global registry, it returns the existing schema.
 *
 * Otherwise, it registers a temporary `z.any()` schema, calls the provided `callback` to create the actual schema,
 * and then replaces the temporary schema with the actual one in the registry.
 *
 * This prevents infinite loops in cases of cyclical dependencies.
 *
 * @param id - The unique identifier for the schema in the global registry.
 * @param callback - A function that returns the Zod schema to be created and registered.
 * @returns The created or retrieved Zod schema.
 * @example
 * ```typescript
 * const CategorySchema = safeSchemaCreation("Category", () =>
 *   z.object({
 *     name: z.string(),
 *     products: z.array(safeSchemaCreation("Product", () =>
 *       z.object({
 *         name: z.string(),
 *         category: z.lazy(() => CategorySchema) // Cyclical reference
 *       })
 *     ))
 *   })
 * );
 * ```
 */
export const safeSchemaCreation = (id: Internal.UID.Schema, callback: () => z.ZodType) => {
  const { _idmap: idMap } = z.globalRegistry;

  const transformedId = transformUidToValidOpenApiName(id);

  const mapItem = idMap.get(transformedId);
  if (mapItem) {
    return mapItem;
  }

  strapi.log.warn(
    `Schema ${transformedId} not found in global registry, creating an any placeholder`
  );

  // Temporary any placeholder before replacing with the actual schema type
  // Used to prevent infinite loops in cyclical data structures
  safeGlobalRegistrySet(id, z.any());

  const schema = callback();

  safeGlobalRegistrySet(id, schema);

  return schema;
};
