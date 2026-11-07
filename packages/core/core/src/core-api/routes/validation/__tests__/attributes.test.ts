import type { Core, Schema } from '@strapi/types';
import * as z from 'zod/v4';

import { createContentAPISchemaRegistry } from '../schema-registry';
import { mapAttributeToSchema } from '../mappers';

const toJsonSchemas = (strapi: Core.Strapi, schema: z.ZodType, id = 'Probe') => {
  const registry = z.registry<{ id: string }>();

  registry.add(schema, { id });

  for (const [key, value] of strapi.contentAPISchemaRegistry.entries()) {
    registry.add(value, { id: key });
  }

  return z.toJSONSchema(registry, {
    target: 'draft-2020-12',
    io: 'output',
    uri: (schemaId: string) => `#/components/schemas/${schemaId}`,
  }).schemas;
};

const createMockStrapi = (): Core.Strapi => {
  const models: Record<string, { attributes: Record<string, Schema.Attribute.AnyAttribute> }> = {
    'shared.hero': {
      attributes: {
        title: { type: 'string' },
      },
    },
    'shared.quote': {
      attributes: {
        body: { type: 'string' },
      },
    },
  };

  return {
    log: {
      debug: jest.fn(),
      error: jest.fn(),
    },
    contentAPISchemaRegistry: createContentAPISchemaRegistry(),
    getModel: jest.fn((uid: string) => models[uid]),
  } as unknown as Core.Strapi;
};

describe('mapAttributeToSchema dynamiczone', () => {
  let strapi: Core.Strapi;

  beforeEach(() => {
    strapi = createMockStrapi();
  });

  it('emits anyOf component refs instead of empty items', () => {
    const schema = mapAttributeToSchema(strapi, {
      type: 'dynamiczone',
      components: ['shared.hero', 'shared.quote'],
    });

    const schemas = toJsonSchemas(strapi, schema);

    expect(schemas.Probe).toMatchObject({
      type: 'array',
      items: {
        anyOf: [
          { $ref: '#/components/schemas/SharedHeroEntry' },
          { $ref: '#/components/schemas/SharedQuoteEntry' },
        ],
      },
      description: 'A dynamic zone field',
    });
    expect(schemas.SharedHeroEntry).toMatchObject({
      type: 'object',
      properties: {
        title: { type: 'string' },
      },
    });
    expect(schemas.SharedQuoteEntry).toMatchObject({
      type: 'object',
      properties: {
        body: { type: 'string' },
      },
    });
  });

  it('uses a single component $ref when the zone has one component', () => {
    const schema = mapAttributeToSchema(strapi, {
      type: 'dynamiczone',
      components: ['shared.hero'],
    });

    const schemas = toJsonSchemas(strapi, schema);

    expect(schemas.Probe).toMatchObject({
      type: 'array',
      items: { $ref: '#/components/schemas/SharedHeroEntry' },
    });
  });

  it('reuses the same registered component schema as a component field', () => {
    mapAttributeToSchema(strapi, {
      type: 'component',
      component: 'shared.hero',
      repeatable: false,
    });

    const dynamicZoneSchema = mapAttributeToSchema(strapi, {
      type: 'dynamiczone',
      components: ['shared.hero', 'shared.quote'],
    });

    const schemas = toJsonSchemas(strapi, dynamicZoneSchema);

    expect(schemas.Probe).toMatchObject({
      items: {
        anyOf: [
          { $ref: '#/components/schemas/SharedHeroEntry' },
          { $ref: '#/components/schemas/SharedQuoteEntry' },
        ],
      },
    });
    expect(strapi.contentAPISchemaRegistry.get('SharedHeroEntry')).toBeDefined();
  });
});
