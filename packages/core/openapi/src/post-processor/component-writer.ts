import { OpenAPIV3_1 } from 'openapi-types';
import * as z from 'zod';
import type { DocumentContext } from '../types';
import {
  OPENAPI_SCHEMA_CONVERSION_OPTIONS,
  stripJsonSchemaId,
  toComponentsPath,
} from '../utils/zod';
import type { PostProcessor } from './types';

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
    }) as OpenAPIV3_1.ComponentsObject;

    for (const schema of Object.values(schemas ?? {})) {
      if (schema && typeof schema === 'object') {
        stripJsonSchemaId(schema);
      }
    }

    const existingComponents = output.data.components ?? {};

    output.data.components = {
      ...existingComponents,
      schemas,
    };
  }
}
