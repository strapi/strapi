import type { Core } from '@strapi/types';
import * as z from 'zod';

import { DocumentContextFactory } from '../src/context';
import { ComponentsWriter } from '../src/post-processor/component-writer';
import {
  OPENAPI_SCHEMA_CONVERSION_OPTIONS,
  toComponentsPath,
  zodToOpenAPI,
} from '../src/utils/zod';
import { createTestContentAPISchemaRegistry } from './helpers/content-api-schema-registry';

describe('zodToOpenAPI', () => {
  it('strips the $id emitted by Zod 4.4.3 registry conversion with uri', () => {
    const schemaStore = createTestContentAPISchemaRegistry();
    const zodSchema = z.object({ name: z.string() });
    const probeRegistry = z.registry<z.core.GlobalMeta>();
    probeRegistry.add(zodSchema, { id: 'Probe' });

    const rawSchema = z.toJSONSchema(probeRegistry, {
      ...OPENAPI_SCHEMA_CONVERSION_OPTIONS,
      uri: toComponentsPath,
    }).schemas.Probe;
    const schema = zodToOpenAPI(zodSchema, schemaStore);

    expect(rawSchema).toHaveProperty('$id', '#/components/schemas/Probe');
    expect(schema).not.toHaveProperty('$id');
    expect(schema).toHaveProperty('$schema', 'https://json-schema.org/draft/2020-12/schema');
    expect(schema).toMatchObject({
      type: 'object',
      properties: {
        name: { type: 'string' },
      },
    });
  });

  it('uses owned component IDs for references without generating __shared definitions', () => {
    const schemaStore = createTestContentAPISchemaRegistry();
    const articleSchema = z.object({ title: z.string() });
    schemaStore.set('Article', articleSchema);

    const schema = zodToOpenAPI(z.object({ article: articleSchema }), schemaStore);

    expect(schema).toMatchObject({
      properties: {
        article: { $ref: '#/components/schemas/Article' },
      },
    });
    expect(JSON.stringify(schema)).not.toContain('__shared');
  });
});

describe('ComponentsWriter', () => {
  it('strips $id from component schemas written from the Strapi-owned registry', () => {
    const schemaStore = createTestContentAPISchemaRegistry();
    const registered = z.object({ title: z.string() });
    schemaStore.set('CoverageProbeDocument', registered);

    const context = new DocumentContextFactory().create({
      strapi: {
        config: { get: () => undefined },
        contentAPISchemaRegistry: schemaStore,
      } as unknown as Core.Strapi,
      routes: [],
    });

    new ComponentsWriter().postProcess(context);

    const schema = context.output.data.components?.schemas?.CoverageProbeDocument;
    expect(schema).toBeDefined();
    expect(schema).not.toHaveProperty('$id');
    expect(schema).toMatchObject({
      type: 'object',
      properties: {
        title: { type: 'string' },
      },
    });
  });
});
