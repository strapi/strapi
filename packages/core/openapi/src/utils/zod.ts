import { OpenApiGeneratorV31, OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { randomUUID } from 'node:crypto';

import type { OpenAPIV3 } from 'openapi-types';
import type { z } from 'zod';

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

export const zodToOpenAPI = (zodSchema: z.Schema): OpenAPIV3.SchemaObject | undefined => {
  const uuid = randomUUID();

  const registry = new OpenAPIRegistry();

  registry.register(uuid, zodSchema);

  const generator = new OpenApiGeneratorV31(registry.definitions);
  const { components } = generator.generateComponents();

  if (!components) {
    throw new Error(`Couldn't generate an OpenAPI schema from the given Zod schema`);
  }

  return components.schemas?.[uuid] as OpenAPIV3.SchemaObject | undefined;
};
