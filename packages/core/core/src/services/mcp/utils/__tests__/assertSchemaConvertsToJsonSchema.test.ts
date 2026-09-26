import type { StandardSchemaWithJSON } from '@modelcontextprotocol/server';
import { z } from '@strapi/utils';
import { assertSchemaConvertsToJsonSchema } from '../assertSchemaConvertsToJsonSchema';

/** Mimics a schema from zod 4.0/4.1, which predates `~standard.jsonSchema`. */
const withoutStandardJsonSchema = (schema: z.ZodType) => {
  const std = schema['~standard'] as StandardSchemaWithJSON['~standard'];
  const { jsonSchema: _jsonSchema, ...standard } = std;

  return { _zod: schema._zod, '~standard': standard } as unknown as StandardSchemaWithJSON;
};

describe('assertSchemaConvertsToJsonSchema', () => {
  test('accepts a schema JSON Schema can represent', () => {
    const schema = z.object({ topic: z.string(), limit: z.number().optional() });

    expect(() => assertSchemaConvertsToJsonSchema(schema, 'input')).not.toThrow();
    expect(() => assertSchemaConvertsToJsonSchema(schema, 'output')).not.toThrow();
  });

  test.each([
    ['z.date()', z.date(), 'Date cannot be represented in JSON Schema'],
    ['a nested z.date()', z.array(z.date().optional()), 'Date cannot be represented'],
    ['z.bigint()', z.bigint(), 'BigInt cannot be represented in JSON Schema'],
    ['z.map()', z.map(z.string(), z.string()), 'Map cannot be represented in JSON Schema'],
    ['z.custom()', z.custom<string>(), 'Custom types cannot be represented in JSON Schema'],
  ])('rejects %s', (_label, field, reason) => {
    expect(() => assertSchemaConvertsToJsonSchema(z.object({ field }), 'input')).toThrow(reason);
  });

  test('converts only the requested side of a transform', () => {
    const schema = z.object({ due: z.string().transform((value) => new Date(value)) });

    expect(() => assertSchemaConvertsToJsonSchema(schema, 'input')).not.toThrow();
    expect(() => assertSchemaConvertsToJsonSchema(schema, 'output')).toThrow(
      'Transforms cannot be represented in JSON Schema'
    );
  });

  test('rejects a non-object root on the input side only', () => {
    expect(() => assertSchemaConvertsToJsonSchema(z.string(), 'input')).toThrow(
      'schema must describe an object (got type: "string")'
    );
    expect(() => assertSchemaConvertsToJsonSchema(z.string(), 'output')).not.toThrow();
  });

  test('accepts an object-shaped root that has no top-level type', () => {
    const schema = z.discriminatedUnion('kind', [
      z.object({ kind: z.literal('a') }),
      z.object({ kind: z.literal('b') }),
    ]);

    expect(() => assertSchemaConvertsToJsonSchema(schema, 'input')).not.toThrow();
  });

  describe('when the schema does not implement ~standard.jsonSchema', () => {
    test('falls back to toJSONSchema for zod 4 schemas', () => {
      expect(() =>
        assertSchemaConvertsToJsonSchema(
          withoutStandardJsonSchema(z.object({ topic: z.string() })),
          'input'
        )
      ).not.toThrow();
      expect(() =>
        assertSchemaConvertsToJsonSchema(
          withoutStandardJsonSchema(z.object({ due: z.date() })),
          'input'
        )
      ).toThrow('Date cannot be represented in JSON Schema');
    });

    test('rejects other schema libraries', () => {
      const schema = {
        '~standard': { version: 1, vendor: 'acme', validate: jest.fn() },
      } as unknown as StandardSchemaWithJSON;

      expect(() => assertSchemaConvertsToJsonSchema(schema, 'input')).toThrow(
        'Schema library "acme" does not implement `~standard.jsonSchema`'
      );
    });
  });
});
