import { describe, it, expect, vi } from 'vitest';

import { renameComponentUIDs } from '../rename-component-uids';

type RecordedUpdate = { table: string; column: string; oldUID: string; newUID: string };

// A `*_cmps` join table attribute, as `@strapi/core` builds it for `component`
// and `dynamiczone` attributes of content types and components.
const cmpsAttribute = (name: string) => ({
  type: 'relation',
  joinTable: { name, pivotColumns: ['entity_id', 'cmp_id', 'field', 'component_type'] },
});

const createDb = (metadata: Record<string, { attributes: Record<string, unknown> }>) => {
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

  it('does nothing without renames', async () => {
    const { db, updates } = createDb(metadata);

    await renameComponentUIDs(db, []);

    expect(db.transaction).not.toHaveBeenCalled();
    expect(updates).toEqual([]);
  });
});
