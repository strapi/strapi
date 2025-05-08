import * as z from 'zod';

import type { OpenAPIV3 } from 'openapi-types';

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
 * import { z } from 'zod';
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
): OpenAPIV3.SchemaObject | z.z.core.JSONSchema.BaseSchema | undefined => {
  const jsonSchema = z.toJSONSchema(zodSchema);

  // TODO: without the use of '@asteasolutions/zod-to-openapi' we need a new way
  // to map this jsonSchema to an OpenAPI compliant Schema Object
  // The purpose of this POC is to show how zod v4 can be used to handle
  // references (e.g. relations and components)
  return jsonSchema;
};
