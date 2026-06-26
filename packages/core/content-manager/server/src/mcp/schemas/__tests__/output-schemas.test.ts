/**
 * Agreement tests between the runtime relation shaping (sanitizers/shape-relations.ts)
 * and the registered MCP output schemas (output-schemas.ts).
 *
 * The MCP SDK validates `structuredContent` against the registered output schema, so any
 * cardinality disagreement (runtime returns an array, schema declares a single object)
 * fails the tool call at runtime. These tests feed the actual runtime shape through the
 * actual schema for every relation kind, so a divergence can no longer ship.
 */
import type { Struct } from '@strapi/types';

import { reduceToIdentity } from '../../sanitizers/shape-relations';
import { buildDocumentOutputSchema, buildListOutputSchema } from '../output-schemas';

const RELATION_ATTRIBUTES: Record<string, { type: 'relation'; relation: string; target?: string }> =
  {
    oneToOneRel: { type: 'relation', relation: 'oneToOne', target: 'api::target.target' },
    manyToOneRel: { type: 'relation', relation: 'manyToOne', target: 'api::target.target' },
    oneWayRel: { type: 'relation', relation: 'oneWay', target: 'api::target.target' },
    morphToOneRel: { type: 'relation', relation: 'morphToOne' },
    oneToManyRel: { type: 'relation', relation: 'oneToMany', target: 'api::target.target' },
    manyToManyRel: { type: 'relation', relation: 'manyToMany', target: 'api::target.target' },
    manyWayRel: { type: 'relation', relation: 'manyWay', target: 'api::target.target' },
    morphToManyRel: { type: 'relation', relation: 'morphToMany' },
    morphManyRel: { type: 'relation', relation: 'morphMany', target: 'api::target.target' },
  };

const TO_ONE_KEYS = ['oneToOneRel', 'manyToOneRel', 'oneWayRel', 'morphToOneRel'];
const TO_MANY_KEYS = [
  'oneToManyRel',
  'manyToManyRel',
  'manyWayRel',
  'morphToManyRel',
  'morphManyRel',
];

const attributes = {
  title: { type: 'string' },
  ...RELATION_ATTRIBUTES,
} as unknown as Struct.SchemaAttributes;

/** A populated relation entry as returned by the document service, before shaping. */
const populatedEntry = {
  documentId: 'doc1',
  locale: 'en',
  __type: 'api::target.target',
  secretField: 'LEAKED',
  publishedAt: '2024-01-01T00:00:00.000Z',
};

describe('runtime shaping ↔ output schema agreement', () => {
  const schema = buildDocumentOutputSchema(attributes, null);

  it.each(TO_MANY_KEYS)('%s: shaped output is an array and passes the schema', (key) => {
    const shaped = reduceToIdentity(RELATION_ATTRIBUTES[key], [populatedEntry, populatedEntry]);

    expect(Array.isArray(shaped)).toBe(true);

    const parsed = schema.safeParse({
      data: { title: 'ok', [key]: shaped },
      meta: { availableLocales: [], availableStatus: [] },
    });
    expect(parsed.success).toBe(true);
  });

  it.each(TO_ONE_KEYS)('%s: shaped output is a single identity and passes the schema', (key) => {
    const shaped = reduceToIdentity(RELATION_ATTRIBUTES[key], populatedEntry);

    expect(Array.isArray(shaped)).toBe(false);

    const parsed = schema.safeParse({
      data: { title: 'ok', [key]: shaped },
      meta: { availableLocales: [], availableStatus: [] },
    });
    expect(parsed.success).toBe(true);
  });

  it.each(TO_ONE_KEYS)('%s: null relation passes the schema', (key) => {
    const parsed = schema.safeParse({
      data: { title: 'ok', [key]: reduceToIdentity(RELATION_ATTRIBUTES[key], null) },
    });
    expect(parsed.success).toBe(true);
  });

  it.each(TO_MANY_KEYS)('%s: empty relation normalizes to [] and passes the schema', (key) => {
    const parsed = schema.safeParse({
      data: { title: 'ok', [key]: reduceToIdentity(RELATION_ATTRIBUTES[key], { count: 0 }) },
    });
    expect(parsed.success).toBe(true);
  });

  it('localizations identity with computed status passes the schema', () => {
    const localizedAttributes = {
      title: { type: 'string' },
      localizations: { type: 'relation', relation: 'oneToMany', target: 'api::test.test' },
    } as unknown as Struct.SchemaAttributes;

    const parsed = buildDocumentOutputSchema(localizedAttributes, null).safeParse({
      data: {
        title: 'ok',
        localizations: [{ documentId: 'loc1', locale: 'fr', status: 'modified' }],
      },
    });
    expect(parsed.success).toBe(true);
  });

  it('list schema accepts shaped many-relations in results', () => {
    const parsed = buildListOutputSchema(attributes, null).safeParse({
      results: [
        {
          title: 'ok',
          manyWayRel: reduceToIdentity(RELATION_ATTRIBUTES.manyWayRel, [populatedEntry]),
        },
      ],
      pagination: { page: 1, pageSize: 10, pageCount: 1, total: 1 },
    });
    expect(parsed.success).toBe(true);
  });

  it('rejects a single object where the runtime returns an array (guards the contract)', () => {
    const parsed = schema.safeParse({
      data: { manyWayRel: { documentId: 'doc1' } },
    });
    expect(parsed.success).toBe(false);
  });
});
