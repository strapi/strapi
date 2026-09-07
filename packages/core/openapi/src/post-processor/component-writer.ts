import { OpenAPIV3_1 } from 'openapi-types';
import * as z from 'zod/v4';
import type { DocumentContext } from '../types';
import {
  OPENAPI_SCHEMA_CONVERSION_OPTIONS,
  liftZodSharedDefinitions,
  toComponentsPath,
} from '../utils/zod';
import type { PostProcessor } from './types';

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && Array.isArray(value) === false;
};

export class ComponentsWriter implements PostProcessor {
  postProcess(context: DocumentContext): void {
    const { output, strapi } = context;
    const registry = z.registry<{ id: string }>();

    for (const [id, schema] of strapi.contentAPISchemaRegistry.entries()) {
      registry.add(schema, { id });
    }

    const { schemas } = z.toJSONSchema(registry, {
      ...OPENAPI_SCHEMA_CONVERSION_OPTIONS,
      uri: toComponentsPath,
    });

    const converted: Record<string, unknown> = isPlainObject(schemas) ? schemas : {};
    liftZodSharedDefinitions(converted);

    const existingComponents = output.data.components ?? {};
    const extracted = context.registries.extractedComponentSchemas;

    output.data.components = {
      ...existingComponents,
      schemas: {
        ...extracted,
        ...(converted as Record<string, OpenAPIV3_1.SchemaObject>),
      },
    };
  }
}
