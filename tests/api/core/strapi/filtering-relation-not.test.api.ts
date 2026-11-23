import type { Core } from '@strapi/types';

import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createContentAPIRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';

/**
 * A `$not` on a relation filters the related rows, like a root `$not` around the same relation
 * filter. Two such conditions, or a relation `$not` beside a root `$not`, must both apply: the
 * database layer used to keep only the last one, so the query returned rows the filter excludes.
 */

const CATEGORY_UID = 'api::rn-category.rn-category';
const AUTHOR_UID = 'api::rn-author.rn-author';
const TAG_UID = 'api::rn-tag.rn-tag';
const NOTE_UID = 'api::rn-note.rn-note';

const namedModel = (name: string, pluralName: string) => ({
  kind: 'collectionType',
  displayName: name,
  singularName: name,
  pluralName,
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
});

const noteModel = {
  kind: 'collectionType',
  displayName: 'rn-note',
  singularName: 'rn-note',
  pluralName: 'rn-notes',
  draftAndPublish: false,
  attributes: {
    title: { type: 'string' },
    category: { type: 'relation', relation: 'manyToOne', target: CATEGORY_UID },
    author: { type: 'relation', relation: 'manyToOne', target: AUTHOR_UID },
    tags: { type: 'relation', relation: 'manyToMany', target: TAG_UID },
  },
};

type Note = { documentId: string; title: string };

const builder = createTestBuilder();
let strapi: Core.Strapi;
let rq: (options: { method: string; url: string; qs?: Record<string, unknown> }) => Promise<{
  statusCode: number;
  body: { data?: Note[]; error?: Record<string, unknown> };
}>;
let graphqlQuery: (query: string) => Promise<{
  statusCode: number;
  body: { data?: { rnNotes?: Note[] }; errors?: unknown[] };
}>;

const titles = (notes: Note[] | undefined) => (notes ?? []).map((note) => note.title).sort();

describe('Filtering with $not on relations', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([
        namedModel('rn-category', 'rn-categories'),
        namedModel('rn-author', 'rn-authors'),
        namedModel('rn-tag', 'rn-tags'),
        noteModel,
      ])
      .build();

    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });

    const authRq = await createAuthRequest({ strapi });
    graphqlQuery = (query) => authRq({ url: '/graphql', method: 'POST', body: { query } });

    const create = async (uid: string, name: string) =>
      (await strapi.documents(uid as any).create({ data: { name } } as any)).documentId;

    const x = await create(CATEGORY_UID, 'x');
    const y = await create(CATEGORY_UID, 'y');
    const p = await create(AUTHOR_UID, 'p');
    const q = await create(AUTHOR_UID, 'q');
    const t1 = await create(TAG_UID, 't1');
    const t2 = await create(TAG_UID, 't2');

    const notes = [
      { title: 'a1', category: x, author: p, tags: [t1, t2] },
      { title: 'a2', category: y, author: p, tags: [t2] },
      // a3 has no tags, a4 has no category
      { title: 'a3', category: y, author: q, tags: [] },
      { title: 'a4', author: q, tags: [t1] },
    ];

    for (const data of notes) {
      await strapi.documents(NOTE_UID).create({ data } as any);
    }
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  // A row with no related row does not match a relation $not, as with a root $not
  const cases: Array<[string, Record<string, unknown>, string[]]> = [
    ['a relation $not', { category: { $not: { name: 'x' } } }, ['a2', 'a3']],
    ['the same filter under a root $not', { $not: { category: { name: 'x' } } }, ['a2', 'a3']],
    ['a to-many relation $not', { tags: { $not: { name: 't1' } } }, ['a1', 'a2']],
    ['the same to-many filter under a root $not', { $not: { tags: { name: 't1' } } }, ['a1', 'a2']],
    [
      'two relation $not filters',
      { category: { $not: { name: 'x' } }, author: { $not: { name: 'p' } } },
      ['a3'],
    ],
    [
      'a root $not beside a relation $not',
      { $not: { title: 'a2' }, category: { $not: { name: 'x' } } },
      ['a3'],
    ],
    [
      'two relation $or lists',
      { category: { $or: [{ name: 'x' }, { name: 'y' }] }, author: { $or: [{ name: 'q' }] } },
      ['a3'],
    ],
  ];

  test.each(cases)('Document Service applies %s', async (_, filters, expected) => {
    const notes = await strapi.documents(NOTE_UID).findMany({ filters } as any);

    expect(titles(notes as unknown as Note[])).toEqual(expected);
  });

  test.each(cases)('REST applies %s', async (_, filters, expected) => {
    const res = await rq({ method: 'GET', url: '/rn-notes', qs: { filters } });

    expect(res.statusCode).toBe(200);
    expect(titles(res.body.data)).toEqual(expected);
  });

  test.each([
    ['a relation not', '{ category: { not: { name: { eq: "x" } } } }', ['a2', 'a3']],
    [
      'two relation not filters',
      '{ category: { not: { name: { eq: "x" } } }, author: { not: { name: { eq: "p" } } } }',
      ['a3'],
    ],
    [
      'a root not beside a relation not',
      '{ not: { title: { eq: "a2" } }, category: { not: { name: { eq: "x" } } } }',
      ['a3'],
    ],
  ])('GraphQL applies %s', async (_, filters, expected) => {
    const res = await graphqlQuery(`{ rnNotes(filters: ${filters}) { title } }`);

    expect(res.body.errors).toBeUndefined();
    expect(titles(res.body.data?.rnNotes)).toEqual(expected);
  });
});
