import { schemaRegistry } from '@strapi/openapi';
import { transformUidToValidOpenApiName } from '@strapi/utils';
import type { Core, Internal } from '@strapi/types';
import * as z from 'zod/v4';

import { inspectZodSchema } from '../../../utils/zod';

// Schema generation happens on-demand when schemas don't exist in the registry

/**
 * Safely adds or updates a schema in Strapi's owned OpenAPI registry.
 *
 * If a schema with the given `id` already exists, it will be removed before adding the new one.
 *
 * This is useful for hot-reloading or preventing issues with cyclical dependencies.
 *
 * @param id - The unique identifier for the schema in Strapi's registry.
 * @param schema - The Zod schema to register.
 * @example
 * ```typescript
 * safeGlobalRegistrySet("mySchema", z.object({ name: z.string() }));
 * ```
 */
export const safeGlobalRegistrySet = (
  strapi: Core.Strapi,
  id: Internal.UID.Schema,
  schema: z.ZodType
) => {
  try {
    const transformedId = transformUidToValidOpenApiName(id);

    const isReplacing = schemaRegistry.has(transformedId);

    strapi.log.debug(
      `${isReplacing ? 'Replacing' : 'Registering'} schema ${transformedId} in Strapi registry`
    );
    schemaRegistry.set(transformedId, schema);
  } catch (error) {
    strapi.log.error(
      `Schema registration failed: Failed to register schema ${id} in Strapi registry`
    );

    throw error;
  }
};

/**
 * Safely creates and registers a Zod schema in Strapi's owned OpenAPI registry, particularly useful for handling cyclical data structures.
 *
 * If a schema with the given `id` already exists in Strapi's registry, it returns the existing schema.
 *
 * Otherwise, it registers a temporary `z.any()` schema, calls the provided `callback` to create the actual schema,
 * and then replaces the temporary schema with the actual one in the registry.
 *
 * This prevents infinite loops in cases of cyclical dependencies.
 *
 * @param id - The unique identifier for the schema in Strapi's registry.
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
export const safeSchemaCreation = (
  strapi: Core.Strapi,
  id: Internal.UID.Schema,
  callback: () => z.ZodType
) => {
  try {
    const transformedId = transformUidToValidOpenApiName(id);

    // Return existing schema if already registered
    const mapItem = schemaRegistry.get(transformedId);
    if (mapItem !== undefined) {
      // Schema already exists, return it silently
      return mapItem;
    }

    strapi.log.debug(`Schema ${transformedId} not found in registry, generating new schema`);

    // Determine if this is a built-in schema or user content
    const isBuiltInSchema = id.startsWith('plugin::') || id.startsWith('admin');

    if (isBuiltInSchema) {
      strapi.log.debug(`Initializing validation schema for ${transformedId}`);
    } else {
      const schemaName = transformedId
        .replace('Document', '')
        .replace('Entry', '')
        .replace(/([A-Z])/g, ' $1')
        .trim();
      strapi.log.debug(`📝 Generating validation schema for "${schemaName}"`);
    }

    // Temporary any placeholder before replacing with the actual schema type
    // Used to prevent infinite loops in cyclical data structures
    safeGlobalRegistrySet(strapi, id, z.any());

    // Generate the actual schema using the callback
    const schema = callback();

    // Replace the placeholder with the real schema
    safeGlobalRegistrySet(strapi, id, schema);

    // Show completion for user content only
    if (!isBuiltInSchema) {
      const inspection = inspectZodSchema(schema);
      const fieldCount = inspection.type === 'object' ? Object.keys(inspection.shape).length : 0;
      const schemaName = transformedId
        .replace('Document', '')
        .replace('Entry', '')
        .replace(/([A-Z])/g, ' $1')
        .trim();
      strapi.log.debug(`   ✅ "${schemaName}" schema created with ${fieldCount} fields`);
    }

    return schema;
  } catch (error) {
    strapi.log.error(`Schema creation failed: Failed to create schema ${id}`);

    throw error;
  }
};
