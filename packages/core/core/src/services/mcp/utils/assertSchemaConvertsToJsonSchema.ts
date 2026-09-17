import type { StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import { z } from '@strapi/utils';

const JSON_SCHEMA_CONVERSION_TARGET = 'draft-2020-12';

/**
 * Throws when the MCP SDK would fail to convert `schema` to JSON Schema while listing capabilities.
 *
 * The SDK converts schemas lazily and unguarded in its `prompts/list` and `tools/list` handlers, so
 * one unconvertible schema fails the whole list. It does not export its converter; this mirrors
 * `standardSchemaToJsonSchema` from `@modelcontextprotocol/server@2.0.0` and must stay in lockstep
 * with it when the SDK is upgraded.
 */
export const assertSchemaConvertsToJsonSchema = (
  schema: StandardSchemaWithJSON,
  io: 'input' | 'output'
): void => {
  const std: Partial<StandardSchemaWithJSON['~standard']> = schema['~standard'];
  let result: Record<string, unknown>;

  if (std.jsonSchema !== undefined) {
    result = std.jsonSchema[io]({ target: JSON_SCHEMA_CONVERSION_TARGET });
  } else if (std.vendor === 'zod' && '_zod' in schema) {
    // zod 4.0 and 4.1 predate `~standard.jsonSchema`; the SDK falls back to `toJSONSchema`.
    result = z.toJSONSchema(schema as unknown as z.ZodType, {
      target: JSON_SCHEMA_CONVERSION_TARGET,
      io,
    });
  } else {
    throw new Error(`Schema library "${std.vendor}" does not implement \`~standard.jsonSchema\``);
  }

  if (io === 'input' && result.type !== undefined && result.type !== 'object') {
    throw new Error(`schema must describe an object (got type: ${JSON.stringify(result.type)})`);
  }
};
