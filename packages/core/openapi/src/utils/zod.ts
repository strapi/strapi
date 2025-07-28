import { randomUUID } from 'node:crypto';
import * as z from 'zod/v4';

import type { OpenAPIV3_1 } from 'openapi-types';

/**
 * Converts a Zod schema to an OpenAPI Schema Object.
 *
 * @description
 * Takes a Zod schema and converts it into an OpenAPI Schema Object (v3.1).
 * It uses a local registry to handle the conversion process and generates the appropriate
 * OpenAPI components.
 *
 * @param zodSchema - The Zod schema to convert to OpenAPI format. Can be any valid Zod schema.
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
 * const openAPISchema = zodToOpenAPI(userSchema);
 * ```
 */

export const zodToOpenAPI = (
  zodSchema: z.ZodType
): OpenAPIV3_1.SchemaObject | OpenAPIV3_1.ReferenceObject => {
  try {
    const id = randomUUID();
    const registry = z.registry<{ id: string }>();

    // Add the schema to the local registry with a custom, unique ID
    registry.add(zodSchema, { id });

    // Copy the global registry definitions into the local registry to make sure references are resolved
    // This prevent "__shared" definitions from being created
    for (const [key, value] of z.globalRegistry._idmap) {
      registry.add(value, { id: key });
    }

    // Generate the schemas and only return the one we want, transform the URI path to be OpenAPI compliant
    const { schemas } = z.toJSONSchema(registry, { uri: toComponentsPath });

    // TODO: make sure it's compliant
    return schemas[id] as OpenAPIV3_1.SchemaObject;
  } catch (e) {
    throw new Error("Couldn't transform the zod schema into an OpenAPI schema");
  }
};

/**
 * Generates a path string for referencing a component schema by its identifier.
 *
 * @param id - The identifier of the component schema.
 * @returns The constructed path string for the specified component schema.
 */
export const toComponentsPath = (id: string) => `#/components/schemas/${id}`;
