import type { Knex } from 'knex';

import { twinComponentKeys, twinComponentKeysMigration } from '../5.0.0-08-component-key-twinning';

type ComponentRow = { id: number; component_key: string };
type LinkRow = {
  entity_id: number;
  component_id: number;
  field: string;
  order: number | null;
  component_type: string | null;
};
type EntityRow = {
  id: number;
  document_id: string;
  locale?: string | null;
  published_at: string | null;
};

const buildHarness = () => {
  const tables = new Set([
    'articles',
    'components_default_blocks',
    'components_default_nested',
    'articles_components',
  ]);
  const columns = new Map<string, Set<string>>([
    ['components_default_blocks', new Set(['id', 'component_key', 'name'])],
    ['components_default_nested', new Set(['id', 'component_key', 'label'])],
  ]);

  const entities: EntityRow[] = [
    { id: 1, document_id: 'doc-1', locale: 'en', published_at: null },
    { id: 2, document_id: 'doc-1', locale: 'en', published_at: '2026-01-01' },
  ];

  const blocks: ComponentRow[] = [
    { id: 10, component_key: 'draft-block-a' },
    { id: 11, component_key: 'draft-block-b' },
    { id: 20, component_key: 'pub-block-a-old' },
    { id: 21, component_key: 'pub-block-b-old' },
  ];

  const nested: ComponentRow[] = [
    { id: 100, component_key: 'draft-nested-a' },
    { id: 200, component_key: 'pub-nested-a-old' },
  ];

  const links: LinkRow[] = [
    // draft entity 1 blocks
    {
      entity_id: 1,
      component_id: 10,
      field: 'blocks',
      order: 1,
      component_type: 'default.block',
    },
    {
      entity_id: 1,
      component_id: 11,
      field: 'blocks',
      order: 2,
      component_type: 'default.block',
    },
    // published entity 2 blocks
    {
      entity_id: 2,
      component_id: 20,
      field: 'blocks',
      order: 1,
      component_type: 'default.block',
    },
    {
      entity_id: 2,
      component_id: 21,
      field: 'blocks',
      order: 2,
      component_type: 'default.block',
    },
    // nested under draft block 10 / published block 20
    {
      entity_id: 10,
      component_id: 100,
      field: 'nested',
      order: 1,
      component_type: 'default.nested',
    },
    {
      entity_id: 20,
      component_id: 200,
      field: 'nested',
      order: 1,
      component_type: 'default.nested',
    },
  ];

  const updates: Array<{ table: string; id: number; component_key: string }> = [];

  const makeSelectBuilder = (tableName: string) => {
    const state: {
      filters: Array<(row: any) => boolean>;
      orderBy?: Array<{ column: string; order: string }>;
      selectMap?: Record<string, string>;
      wantFirst?: boolean;
    } = { filters: [] };

    const builder: any = {
      select: jest.fn((arg?: any) => {
        if (arg && typeof arg === 'object' && !Array.isArray(arg)) {
          state.selectMap = arg;
        }
        return builder;
      }),
      where: jest.fn((colOrObj: any, value?: any) => {
        if (typeof colOrObj === 'object') {
          state.filters.push((row) => Object.entries(colOrObj).every(([k, v]) => row[k] === v));
        } else if (typeof colOrObj === 'string') {
          state.filters.push((row) => row[colOrObj] === value);
        }
        return builder;
      }),
      whereNull: jest.fn((col: string) => {
        state.filters.push((row) => row[col] == null);
        return builder;
      }),
      whereNotNull: jest.fn((col: string) => {
        state.filters.push((row) => row[col] != null);
        return builder;
      }),
      orderBy: jest.fn((arg: any) => {
        state.orderBy = Array.isArray(arg) ? arg : [{ column: arg, order: 'asc' }];
        return builder;
      }),
      update: jest.fn(async (payload: { component_key: string }) => {
        const match = (tableName === 'components_default_blocks' ? blocks : nested).find((row) =>
          state.filters.every((fn) => fn(row))
        );
        if (match) {
          match.component_key = payload.component_key;
          updates.push({ table: tableName, id: match.id, component_key: payload.component_key });
        }
        return 1;
      }),
      first: jest.fn(async () => {
        state.wantFirst = true;
        const rows = resolveRows();
        return rows[0];
      }),
      then: undefined as any,
    };

    const resolveRows = () => {
      let rows: any[] = [];
      if (tableName === 'articles') {
        rows = entities.map((e) => ({ ...e }));
      } else if (tableName === 'components_default_blocks') {
        rows = blocks.map((b) => ({ ...b }));
      } else if (tableName === 'components_default_nested') {
        rows = nested.map((b) => ({ ...b }));
      } else if (tableName === 'articles_components') {
        rows = links.map((l) => ({ ...l }));
      }

      rows = rows.filter((row) => state.filters.every((fn) => fn(row)));

      if (state.orderBy) {
        rows.sort((a, b) => {
          for (const { column, order } of state.orderBy!) {
            const av = a[column];
            const bv = b[column];
            if (av === bv) continue;
            const cmp = av > bv ? 1 : -1;
            return order === 'desc' ? -cmp : cmp;
          }
          return 0;
        });
      }

      if (state.selectMap) {
        rows = rows.map((row) => {
          const out: any = {};
          for (const [alias, col] of Object.entries(state.selectMap!)) {
            out[alias] = typeof col === 'string' ? row[col] : null;
          }
          return out;
        });
      }

      return rows;
    };

    builder.then = (resolve: any, reject: any) =>
      Promise.resolve(resolveRows()).then(resolve, reject);

    return builder;
  };

  const knex: any = jest.fn((tableName: string) => makeSelectBuilder(tableName));
  knex.raw = jest.fn((sql: string) => sql);
  knex.schema = {
    hasTable: jest.fn(async (tableName: string) => tables.has(tableName)),
    hasColumn: jest.fn(async (tableName: string, column: string) =>
      Boolean(columns.get(tableName)?.has(column))
    ),
  };

  const blockJoin = {
    name: 'articles_components',
    joinColumn: { name: 'entity_id', referencedColumn: 'id' },
    inverseJoinColumn: { name: 'component_id', referencedColumn: 'id' },
    on: { field: 'blocks' },
    orderColumnName: 'order',
    pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
  };

  const nestedJoin = {
    name: 'articles_components',
    joinColumn: { name: 'entity_id', referencedColumn: 'id' },
    inverseJoinColumn: { name: 'component_id', referencedColumn: 'id' },
    on: { field: 'nested' },
    orderColumnName: 'order',
    pivotColumns: ['entity_id', 'component_id', 'field', 'component_type'],
  };

  const metadata = new Map<string, any>([
    [
      'api::article.article',
      {
        tableName: 'articles',
        attributes: {
          documentId: { type: 'string' },
          publishedAt: { type: 'datetime' },
          locale: { type: 'string' },
          blocks: {
            type: 'relation',
            relation: 'oneToMany',
            target: 'default.block',
            joinTable: blockJoin,
          },
        },
      },
    ],
    [
      'default.block',
      {
        tableName: 'components_default_blocks',
        attributes: {
          componentKey: { type: 'string' },
          nested: {
            type: 'relation',
            relation: 'oneToOne',
            target: 'default.nested',
            joinTable: nestedJoin,
          },
        },
      },
    ],
    [
      'default.nested',
      {
        tableName: 'components_default_nested',
        attributes: {
          componentKey: { type: 'string' },
        },
      },
    ],
  ]);

  const db: any = {
    metadata: {
      values: () => metadata.values(),
      get: (uid: string) => metadata.get(uid),
    },
  };

  return {
    knex: knex as unknown as Knex.Transaction,
    db,
    get updates() {
      return updates;
    },
    get blocks() {
      return blocks;
    },
    get nested() {
      return nested;
    },
  };
};

describe('twinComponentKeys migration', () => {
  it('exports the expected migration name', () => {
    expect(twinComponentKeysMigration.name).toBe('5.0.0-08-component-key-twinning');
  });

  it('copies draft component_key onto matching published rows including nested', async () => {
    const h = buildHarness();

    await twinComponentKeys(h.knex, h.db);

    expect(h.blocks.find((b) => b.id === 20)?.component_key).toBe('draft-block-a');
    expect(h.blocks.find((b) => b.id === 21)?.component_key).toBe('draft-block-b');
    expect(h.nested.find((n) => n.id === 200)?.component_key).toBe('draft-nested-a');

    expect(h.updates.map((u) => `${u.table}:${u.id}:${u.component_key}`).sort()).toEqual(
      [
        'components_default_blocks:20:draft-block-a',
        'components_default_blocks:21:draft-block-b',
        'components_default_nested:200:draft-nested-a',
      ].sort()
    );
  });

  it('is a no-op when keys already match', async () => {
    const h = buildHarness();
    h.blocks.find((b) => b.id === 20)!.component_key = 'draft-block-a';
    h.blocks.find((b) => b.id === 21)!.component_key = 'draft-block-b';
    h.nested.find((n) => n.id === 200)!.component_key = 'draft-nested-a';

    await twinComponentKeys(h.knex, h.db);

    expect(h.updates).toEqual([]);
  });

  it('skips content types without draft & publish', async () => {
    const h = buildHarness();
    // Replace metadata with a CT lacking publishedAt
    const metadata = new Map([
      [
        'api::page.page',
        {
          tableName: 'pages',
          attributes: {
            documentId: { type: 'string' },
          },
        },
      ],
    ]);
    h.db.metadata = {
      values: () => metadata.values(),
      get: (uid: string) => metadata.get(uid),
    };

    await expect(twinComponentKeys(h.knex, h.db)).resolves.toBeUndefined();
    expect(h.updates).toEqual([]);
  });
});
