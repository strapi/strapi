import Ajv2020 from 'ajv/dist/2020';
import addFormats from 'ajv-formats';
import type { AdvertisedJsonSchema, AdvertisedTool } from './mcp-client';

export const JSON_SCHEMA_2020_12 = 'https://json-schema.org/draft/2020-12/schema';

/**
 * Applies a strict JSON Schema 2020-12 capability gate to an advertised schema.
 * This models clients that silently exclude a tool when either schema cannot compile.
 */
export const strictClientAcceptsSchema = (schema: AdvertisedJsonSchema): boolean => {
  if (schema.$schema !== undefined && schema.$schema !== JSON_SCHEMA_2020_12) {
    return false;
  }

  try {
    // `strictTuples` is an AJV authoring lint, not JSON Schema validation. Zod emits valid
    // 2020-12 `prefixItems` without the optional fixed-length assertion.
    const ajv = new Ajv2020({ strict: true, strictTuples: false });
    addFormats(ajv);
    ajv.compile(schema);
    return true;
  } catch {
    return false;
  }
};

/**
 * Returns exactly the tools a strict schema-validating client would retain.
 */
export const getStrictClientUsableTools = (tools: AdvertisedTool[]): AdvertisedTool[] =>
  tools.filter(
    (tool) =>
      strictClientAcceptsSchema(tool.inputSchema) &&
      (tool.outputSchema === undefined || strictClientAcceptsSchema(tool.outputSchema))
  );
