import type { Core } from '@strapi/types';
import type { OpenAPIV3_1 } from 'openapi-types';
import * as z from 'zod';

import { OperationResponsesAssembler } from '../src/assemblers/document/path/path-item/operation';
import { DocumentContextFactory, OperationContextFactory } from '../src/context';
import { ComponentsWriter } from '../src/post-processor/component-writer';
import {
  OPENAPI_SCHEMA_CONVERSION_OPTIONS,
  toComponentsPath,
  zodToOpenAPI,
} from '../src/utils/zod';
import { createTestContentAPISchemaRegistry } from './helpers/content-api-schema-registry';

const createStrapiMock = (
  schemaStore: Core.ContentAPISchemaRegistry
): Pick<Core.Strapi, 'config' | 'contentAPISchemaRegistry'> => ({
  config: {
    get: () => undefined,
  } as Core.Strapi['config'],
  contentAPISchemaRegistry: schemaStore,
});

const isPlainObject = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null && Array.isArray(value) === false;
};

const collectLocalRefs = (value: unknown, refs: string[], seen: WeakSet<object>): void => {
  if (Array.isArray(value)) {
    if (seen.has(value)) {
      return;
    }
    seen.add(value);
    for (const item of value) {
      collectLocalRefs(item, refs, seen);
    }
    return;
  }

  if (isPlainObject(value) === false) {
    return;
  }

  if (seen.has(value)) {
    return;
  }
  seen.add(value);

  const ref = value.$ref;
  if (typeof ref === 'string' && ref.startsWith('#/')) {
    refs.push(ref);
  }

  for (const nested of Object.values(value)) {
    collectLocalRefs(nested, refs, seen);
  }
};

const getByJsonPointer = (root: unknown, pointer: string): unknown => {
  if (pointer.startsWith('#/') === false) {
    return undefined;
  }

  const segments = pointer
    .slice(2)
    .split('/')
    .map((segment) => segment.replace(/~1/g, '/').replace(/~0/g, '~'));

  let current: unknown = root;
  for (const segment of segments) {
    if (Array.isArray(current)) {
      const index = Number(segment);
      if (Number.isInteger(index) === false || index < 0 || index >= current.length) {
        return undefined;
      }
      current = current[index];
      continue;
    }

    if (isPlainObject(current) === false) {
      return undefined;
    }

    if (Object.prototype.hasOwnProperty.call(current, segment) === false) {
      return undefined;
    }

    current = current[segment];
  }

  return current;
};

const assertLocalRefsResolve = (document: unknown) => {
  const refs: string[] = [];
  collectLocalRefs(document, refs, new WeakSet());

  for (const ref of refs) {
    if (getByJsonPointer(document, ref) === undefined) {
      throw new Error(`unresolved $ref: ${ref}`);
    }
  }
};

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
      strapi: createStrapiMock(schemaStore) as Core.Strapi,
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

  it('emits nested .meta({ id }) schemas found while converting the owned store', () => {
    const schemaStore = createTestContentAPISchemaRegistry();
    const nested = z.object({ value: z.string() }).meta({ id: 'OwnedNested' });
    schemaStore.set('OwnedRoot', z.object({ nested }));

    const context = new DocumentContextFactory().create({
      strapi: createStrapiMock(schemaStore) as Core.Strapi,
      routes: [],
    });

    new ComponentsWriter().postProcess(context);

    const document = context.output.data;
    expect(document.components?.schemas?.OwnedRoot).toMatchObject({
      type: 'object',
      properties: {
        nested: { $ref: '#/components/schemas/OwnedNested' },
      },
    });
    expect(document.components?.schemas?.OwnedNested).toMatchObject({
      type: 'object',
      properties: {
        value: { type: 'string' },
      },
    });
    expect(JSON.stringify(document)).not.toContain('__shared');
    assertLocalRefsResolve(document);
  });

  it('merges route-harvested plugin schemas so nested .meta({ id }) refs resolve', () => {
    const schemaStore = createTestContentAPISchemaRegistry();
    const pluginSchema = z.object({ value: z.string() }).meta({ id: 'PluginShared' });
    const response = z.object({ data: pluginSchema });

    const documentContext = new DocumentContextFactory().create({
      strapi: createStrapiMock(schemaStore) as Core.Strapi,
      routes: [],
    });

    const operationContext = new OperationContextFactory().create({
      strapi: documentContext.strapi,
      routes: documentContext.routes,
      registries: documentContext.registries,
      timer: documentContext.timer,
    });

    new OperationResponsesAssembler().assemble(operationContext, {
      method: 'GET',
      path: '/plugin',
      handler: '',
      info: { type: 'content-api' },
      response,
    } as Core.Route);

    documentContext.output.data.paths = {
      '/plugin': {
        get: operationContext.output.data as OpenAPIV3_1.OperationObject,
      },
    };

    new ComponentsWriter().postProcess(documentContext);

    const document = documentContext.output.data;
    const pluginShared = document.components?.schemas?.PluginShared;
    const responseSchema = (
      document.paths?.['/plugin']?.get?.responses?.['200'] as OpenAPIV3_1.ResponseObject
    )?.content?.['application/json']?.schema;

    expect(pluginShared).toMatchObject({
      type: 'object',
      properties: {
        value: { type: 'string' },
      },
    });
    expect(responseSchema).toMatchObject({
      properties: {
        data: { $ref: '#/components/schemas/PluginShared' },
      },
    });
    expect(JSON.stringify(document)).not.toContain('__shared');
    assertLocalRefsResolve(document);
  });
});
