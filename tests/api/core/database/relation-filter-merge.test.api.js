'use strict';

// Two relation filters that each carry a group operator ($or / $and) must both apply.
// Before the fix, `processWhere` merged each relation's compiled where with Object.assign, so
// the second relation's `$or` replaced the first one's and that constraint was silently dropped.

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');

const builder = createTestBuilder();
let strapi;

const writer = {
  displayName: 'writer',
  singularName: 'writer',
  pluralName: 'writers',
  kind: 'collectionType',
  attributes: { name: { type: 'string' } },
};

const cat = {
  displayName: 'cat',
  singularName: 'cat',
  pluralName: 'cats',
  kind: 'collectionType',
  attributes: { title: { type: 'string' } },
};

const thing = {
  displayName: 'thing',
  singularName: 'thing',
  pluralName: 'things',
  kind: 'collectionType',
  attributes: {
    label: { type: 'string' },
    writer: { type: 'relation', relation: 'manyToOne', target: 'api::writer.writer' },
    cat: { type: 'relation', relation: 'manyToOne', target: 'api::cat.cat' },
  },
};

const fixtures = {
  writer: [{ name: 'A' }, { name: 'B' }, { name: 'C' }],
  cat: [{ title: 'P' }, { title: 'Q' }, { title: 'R' }],
  thing: ({ writer: w, cat: c }) => [
    { label: 't1', writer: w[0].id, cat: c[0].id }, // A, P -> matches both groups
    { label: 't2', writer: w[0].id, cat: c[2].id }, // A, R -> writer ok, cat not in {P, Q}
    { label: 't3', writer: w[2].id, cat: c[0].id }, // C, P -> cat ok, writer not in {A, B}
  ],
};

const labelsFor = async (where) => {
  const rows = await strapi.db.query('api::thing.thing').findMany({ where });
  return rows.map((row) => row.label).sort();
};

describe('Relation filters with group operators', () => {
  beforeAll(async () => {
    await builder
      .addContentTypes([writer, cat, thing])
      .addFixtures(writer.singularName, fixtures.writer)
      .addFixtures(cat.singularName, fixtures.cat)
      .addFixtures(thing.singularName, fixtures.thing)
      .build();

    strapi = await createStrapiInstance();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  test('two relations with $or at the same level both apply', async () => {
    const labels = await labelsFor({
      writer: { $or: [{ name: 'A' }, { name: 'B' }] },
      cat: { $or: [{ title: 'P' }, { title: 'Q' }] },
    });

    expect(labels).toEqual(['t1']);
  });

  test('two relations with $and at the same level both apply', async () => {
    const labels = await labelsFor({
      writer: { $and: [{ name: { $ne: 'B' } }, { name: { $ne: 'C' } }] },
      cat: { $and: [{ title: { $ne: 'Q' } }, { title: { $ne: 'R' } }] },
    });

    expect(labels).toEqual(['t1']);
  });

  test('a relation $or next to a relation $and both apply', async () => {
    const labels = await labelsFor({
      writer: { $or: [{ name: 'A' }, { name: 'B' }] },
      cat: { $and: [{ title: { $ne: 'Q' } }, { title: { $ne: 'R' } }] },
    });

    expect(labels).toEqual(['t1']);
  });

  test('a root $and alongside relation group operators keeps every constraint', async () => {
    const labels = await labelsFor({
      $and: [{ label: { $ne: 'nope' } }],
      writer: { $or: [{ name: 'A' }, { name: 'B' }] },
      cat: { $or: [{ title: 'P' }, { title: 'Q' }] },
    });

    expect(labels).toEqual(['t1']);
  });

  test('explicitly $and-wrapped relation filters still work', async () => {
    const labels = await labelsFor({
      $and: [
        { writer: { $or: [{ name: 'A' }, { name: 'B' }] } },
        { cat: { $or: [{ title: 'P' }, { title: 'Q' }] } },
      ],
    });

    expect(labels).toEqual(['t1']);
  });
});
