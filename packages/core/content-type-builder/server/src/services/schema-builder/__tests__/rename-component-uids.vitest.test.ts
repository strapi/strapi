import { describe, it, expect, vi } from 'vitest';

import { renameComponentUIDs } from '../rename-component-uids';

type RecordedUpdate = { table: string; column: string; oldUID: string; newUID: string };

// A `*_cmps` join table attribute, as `@strapi/core` builds it for `component`
// and `dynamiczone` attributes of content types and components.
const cmpsAttribute = (name: string) => ({
  type: 'relation',
  joinTable: { name, pivotColumns: ['entity_id', 'cmp_id', 'field', 'component_type'] },
});

// The media side of upload's `related` morph: every `media` attribute points at the
// same `files_related_mph` join table, whose `related_type` holds the model uid.
const mediaAttribute = () => ({
  type: 'relation',
  relation: 'morphMany',
  joinTable: {
    name: 'files_related_mph',
    pivotColumns: ['file_id', 'related_id', 'related_type'],
    morphColumn: {
      typeColumn: { name: 'related_type' },
      idColumn: { name: 'related_id', referencedColumn: 'id' },
    },
  },
});

const createDb = (
  metadata: Record<string, { tableName?: string; attributes: Record<string, unknown> }>
) => {
  const updates: RecordedUpdate[] = [];
  const trx = { id: 'trx' };

  const db = {
    metadata: new Map(Object.entries(metadata)),
    transaction: vi.fn(async (run: (args: { trx: unknown }) => Promise<unknown>) => run({ trx })),
    getConnection: vi.fn((table: string) => ({
      where: (column: string, oldUID: string) => ({
        update: (values: Record<string, string>) => ({
          transacting: vi.fn(async (usedTrx: unknown) => {
            expect(usedTrx).toBe(trx);
            updates.push({ table, column, oldUID, newUID: values[column] });
            return 1;
          }),
        }),
      }),
    })),
  };

  return { db: db as any, updates };
};

const metadata = {
  'api::page.page': {
    attributes: {
      title: { type: 'string' },
      // a dynamic zone and a single component share the content type's join table
      sections: cmpsAttribute('pages_cmps'),
      hero: cmpsAttribute('pages_cmps'),
    },
  },
  // a component nesting another component has its own join table
  'default.wrapper': {
    attributes: { inner: cmpsAttribute('components_default_wrappers_cmps') },
  },
  // a regular relation join table has no component_type pivot
  'api::article.article': {
    attributes: {
      tags: {
        type: 'relation',
        joinTable: { name: 'articles_tags_lnk', pivotColumns: ['article_id', 'tag_id'] },
      },
    },
  },
};

const morphMetadata = {
  // the owning side of the media morph
  'plugin::upload.file': {
    tableName: 'files',
    attributes: {
      related: {
        type: 'relation',
        relation: 'morphToMany',
        joinTable: mediaAttribute().joinTable,
      },
    },
  },
  'default.card': {
    tableName: 'components_default_cards',
    attributes: { image: mediaAttribute() },
  },
  'api::page.page': {
    tableName: 'pages',
    attributes: { cover: mediaAttribute(), hero: cmpsAttribute('pages_cmps') },
  },
  // a morphToOne without join table keeps its type column on the owner's table
  'api::comment.comment': {
    tableName: 'comments',
    attributes: {
      target: {
        type: 'relation',
        relation: 'morphToOne',
        morphColumn: {
          typeColumn: { name: 'target_type' },
          idColumn: { name: 'target_id', referencedColumn: 'id' },
        },
      },
    },
  },
};

describe('renameComponentUIDs', () => {
  it('rewrites component_type once per join table and rename, inside a transaction', async () => {
    const { db, updates } = createDb(metadata);

    await renameComponentUIDs(db, [{ oldUID: 'default.card', newUID: 'blocks.card' }]);

    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(updates).toEqual([
      {
        table: 'pages_cmps',
        column: 'component_type',
        oldUID: 'default.card',
        newUID: 'blocks.card',
      },
      {
        table: 'components_default_wrappers_cmps',
        column: 'component_type',
        oldUID: 'default.card',
        newUID: 'blocks.card',
      },
    ]);
  });

  it('applies every rename to every join table', async () => {
    const { db, updates } = createDb(metadata);

    await renameComponentUIDs(db, [
      { oldUID: 'default.card', newUID: 'sections2.card' },
      { oldUID: 'default.wrapper', newUID: 'sections2.wrapper' },
    ]);

    expect(updates.map(({ table, oldUID, newUID }) => [table, oldUID, newUID])).toEqual([
      ['pages_cmps', 'default.card', 'sections2.card'],
      ['pages_cmps', 'default.wrapper', 'sections2.wrapper'],
      ['components_default_wrappers_cmps', 'default.card', 'sections2.card'],
      ['components_default_wrappers_cmps', 'default.wrapper', 'sections2.wrapper'],
    ]);
  });

  it('rewrites the type column of polymorphic tables once per table and rename', async () => {
    const { db, updates } = createDb(morphMetadata);

    await renameComponentUIDs(db, [
      { oldUID: 'default.card', newUID: 'blocks.card' },
      { oldUID: 'default.wrapper', newUID: 'blocks.wrapper' },
    ]);

    // `files_related_mph` is shared by `related`, `image` and `cover` but updated once
    // per rename, in the same transaction as the component join tables.
    expect(db.transaction).toHaveBeenCalledTimes(1);
    expect(
      updates.map(({ table, column, oldUID, newUID }) => [table, column, oldUID, newUID])
    ).toEqual([
      ['files_related_mph', 'related_type', 'default.card', 'blocks.card'],
      ['files_related_mph', 'related_type', 'default.wrapper', 'blocks.wrapper'],
      ['pages_cmps', 'component_type', 'default.card', 'blocks.card'],
      ['pages_cmps', 'component_type', 'default.wrapper', 'blocks.wrapper'],
      ['comments', 'target_type', 'default.card', 'blocks.card'],
      ['comments', 'target_type', 'default.wrapper', 'blocks.wrapper'],
    ]);
  });

  it('does nothing without renames', async () => {
    const { db, updates } = createDb(metadata);

    await renameComponentUIDs(db, []);

    expect(db.transaction).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });
});
