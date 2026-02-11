import { transformUidToValidOpenApiName } from '@strapi/utils';
import type { Internal } from '@strapi/types';
import * as z from 'zod/v4';

// Schema generation happens on-demand when schemas don't exist in the registry

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
  try {
    const { _idmap: idMap } = z.globalRegistry;

    const transformedId = transformUidToValidOpenApiName(id);

    const isReplacing = idMap.has(transformedId);

    if (isReplacing) {
      // Remove existing schema to prevent conflicts
      idMap.delete(transformedId);
    }

    // Register the new schema with the transformed ID
    strapi.log.debug(
      `${isReplacing ? 'Replacing' : 'Registering'} schema ${transformedId} in global registry`
    );
    z.globalRegistry.add(schema, { id: transformedId });
  } catch (error) {
    strapi.log.error(
      `Schema registration failed: Failed to register schema ${id} in global registry`
    );

    throw error;
  }
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
  try {
    const { _idmap: idMap } = z.globalRegistry;

    const transformedId = transformUidToValidOpenApiName(id);

    // Return existing schema if already registered
    const mapItem = idMap.get(transformedId);
    if (mapItem) {
      // Schema already exists, return it silently
      return mapItem;
    }

    strapi.log.debug(`Schema ${transformedId} not found in registry, generating new schema`);

    // Determine if this is a built-in schema or user content
    const isBuiltInSchema = id.startsWith('plugin::') || id.startsWith('admin');

    if (isBuiltInSchema) {
      // Built-in schemas keep at debug level to avoid clutter
      strapi.log.debug(`Initializing validation schema for ${transformedId}`);
    } else {
      // User content
      const schemaName = transformedId
        .replace('Document', '')
        .replace('Entry', '')
        .replace(/([A-Z])/g, ' $1')
        .trim();
      strapi.log.debug(`📝 Generating validation schema for "${schemaName}"`);
    }

    // Temporary any placeholder before replacing with the actual schema type
    // Used to prevent infinite loops in cyclical data structures
    safeGlobalRegistrySet(id, z.any());

    // Generate the actual schema using the callback
    const schema = callback();

    // Replace the placeholder with the real schema
    safeGlobalRegistrySet(id, schema);

    // Show completion for user content only
    if (!isBuiltInSchema) {
      const fieldCount = Object.keys((schema as any)?._def?.shape || {}).length || 0;
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
