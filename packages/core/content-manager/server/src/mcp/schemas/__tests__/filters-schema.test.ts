import { z } from '@strapi/utils';
import type { Struct } from '@strapi/types';
import { buildFiltersSchema } from '../filters-schema';

const attributes = {
  title: { type: 'string' },
  rank: { type: 'integer' },
  featured: { type: 'boolean' },
} as unknown as Struct.SchemaAttributes;

/**
 * Counts how many times the schema builder reads attribute definitions, which happens once per
 * construction of the recursive filters object.
 */
const withReadCounter = (source: Struct.SchemaAttributes) => {
  const counter = { reads: 0 };
  const proxy = new Proxy(source, {
    get(target, key, receiver) {
      if (typeof key === 'string' && key in target) {
        counter.reads += 1;
      }
      return Reflect.get(target, key, receiver);
    },
  });
  return { attributes: proxy, counter };
};

describe('buildFiltersSchema', () => {
  test('accepts field operators and logical operators', () => {
    const schema = buildFiltersSchema(attributes);

    expect(schema.safeParse({ title: { $contains: 'a' } }).success).toBe(true);
    expect(schema.safeParse({ $or: [{ rank: { $gt: 1 } }, { featured: true }] }).success).toBe(
      true
    );
    expect(schema.safeParse({ $not: { title: 'a' } }).success).toBe(true);
    expect(schema.safeParse({ unknown: 'a' }).success).toBe(false);
  });

  test('builds the recursive filters object once, however often it is traversed', () => {
    const counted = withReadCounter(attributes);
    const schema = buildFiltersSchema(counted.attributes);
    counted.counter.reads = 0;

    z.toJSONSchema(schema, { io: 'input' });
    z.toJSONSchema(schema, { io: 'input' });
    schema.safeParse({ $and: [{ $or: [{ title: 'a' }] }] });

    // One read per scalar field: the lazy object is constructed a single time.
    expect(counted.counter.reads).toBe(Object.keys(attributes).length);
  });
});
