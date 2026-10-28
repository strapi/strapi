import { describe, it, expect, vi, beforeEach } from 'vitest';

import { updateSchema } from '../schema';
import type { Schema as CTBSchema } from '../../controllers/validation/schema';

const builder = vi.hoisted(() => ({
  contentTypes: new Map<string, unknown>(),
  components: new Map<string, unknown>(),
  editContentType: vi.fn(),
  writeFiles: vi.fn(),
  rollback: vi.fn(),
}));

const apiHandler = vi.hoisted(() => ({
  backup: vi.fn(),
  clear: vi.fn(),
  rollback: vi.fn(),
  clearGenerated: vi.fn(),
  finalize: vi.fn(),
}));

const contentStructure = vi.hoisted(() => ({
  validateFromUpdate: vi.fn(),
  commitFromUpdate: vi.fn(),
}));

vi.mock('../schema-builder', () => ({ default: vi.fn(() => builder) }));
vi.mock('../../utils', () => ({
  getService: vi.fn((name: string) =>
    name === 'content-structure' ? contentStructure : apiHandler
  ),
}));

type Row = { documentId: string | null; locale?: string; publishedAt: string | null };
type DocumentIdFilter = { $ne?: string | null; $null?: boolean; $notNull?: boolean };
type Where = { documentId?: DocumentIdFilter; $or?: Where[] };

const uid = 'api::article.article';

/**
 * Mirrors how the database layer turns these filters into SQL: `$ne: value` becomes
 * `<> value`, which never matches a NULL column, and `findOne` returns the first row
 * in storage order since the guard does not sort.
 */
const matchesDocumentId = (documentId: string | null, filter: DocumentIdFilter) => {
  if (filter.$null === true) {
    return documentId === null;
  }
  if (filter.$notNull === true) {
    return documentId !== null;
  }
  if (filter.$ne === null) {
    return documentId !== null;
  }
  return documentId !== null && documentId !== filter.$ne;
};

const matches = (row: Row, where?: Where): boolean => {
  if (where === undefined) {
    return true;
  }
  if (where.$or !== undefined) {
    return where.$or.some((subWhere) => matches(row, subWhere));
  }
  if (where.documentId !== undefined) {
    return matchesDocumentId(row.documentId, where.documentId);
  }
  return true;
};

const mockRows = (rows: Row[]) => {
  strapi.db.query = vi.fn(() => ({
    count: vi.fn(async (params?: { where?: Where }) => {
      return rows.filter((row) => matches(row, params?.where)).length;
    }),
    findOne: vi.fn(async (params?: { where?: Where }) => {
      return rows.find((row) => matches(row, params?.where)) ?? null;
    }),
  })) as any;
};

const switchToSingleType = () =>
  updateSchema({
    contentTypes: [
      {
        action: 'update',
        uid,
        displayName: 'Article',
        kind: 'singleType',
        draftAndPublish: true,
        pluginOptions: {},
        options: {},
        attributes: [],
      },
    ],
    components: [],
  } as unknown as CTBSchema);

describe('updateSchema collectionType to singleType entry guard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    builder.writeFiles.mockResolvedValue(true);

    (global as any).strapi = {
      contentTypes: {
        [uid]: { uid, kind: 'collectionType', attributes: {} },
      },
      components: {},
      plugins: {
        'content-type-builder': { config: (_key: string, defaultValue: unknown) => defaultValue },
      },
      plugin: (name: string) => (global as any).strapi.plugins[name],
      db: {},
      eventHub: { emit: vi.fn() },
      log: { error: vi.fn(), warn: vi.fn() },
    };
  });

  it('allows the switch when the only document has a draft and a published row', async () => {
    mockRows([
      { documentId: 'doc-1', publishedAt: null },
      { documentId: 'doc-1', publishedAt: '2026-01-01T00:00:00.000Z' },
    ]);

    await expect(switchToSingleType()).resolves.toBeUndefined();
    expect(builder.writeFiles).toHaveBeenCalledTimes(1);
  });

  it('allows the switch when the only document exists in several locales', async () => {
    mockRows([
      { documentId: 'doc-1', locale: 'en', publishedAt: null },
      { documentId: 'doc-1', locale: 'en', publishedAt: '2026-01-01T00:00:00.000Z' },
      { documentId: 'doc-1', locale: 'fr', publishedAt: null },
      { documentId: 'doc-1', locale: 'fr', publishedAt: '2026-01-01T00:00:00.000Z' },
    ]);

    await expect(switchToSingleType()).resolves.toBeUndefined();
    expect(builder.writeFiles).toHaveBeenCalledTimes(1);
  });

  it('rejects the switch when several documents exist', async () => {
    mockRows([
      { documentId: 'doc-1', publishedAt: null },
      { documentId: 'doc-2', publishedAt: null },
    ]);

    await expect(switchToSingleType()).rejects.toThrow(
      'You cannot convert a collectionType to a singleType when having multiple entries in DB'
    );
    expect(builder.editContentType).not.toHaveBeenCalled();
    expect(builder.writeFiles).not.toHaveBeenCalled();
    expect(contentStructure.commitFromUpdate).not.toHaveBeenCalled();
  });

  it.each([
    {
      name: 'a row without documentId comes after a document',
      rows: [
        { documentId: 'doc-1', publishedAt: null },
        { documentId: null, publishedAt: null },
      ],
    },
    {
      name: 'a row without documentId comes before a document',
      rows: [
        { documentId: null, publishedAt: null },
        { documentId: 'doc-1', publishedAt: null },
      ],
    },
    {
      name: 'several rows have no documentId',
      rows: [
        { documentId: null, publishedAt: null },
        { documentId: null, publishedAt: null },
      ],
    },
  ])('rejects the switch when $name', async ({ rows }) => {
    mockRows(rows);

    await expect(switchToSingleType()).rejects.toThrow(
      'You cannot convert a collectionType to a singleType when having multiple entries in DB'
    );
    expect(builder.writeFiles).not.toHaveBeenCalled();
  });

  it('allows the switch when the only row has no documentId', async () => {
    mockRows([{ documentId: null, publishedAt: null }]);

    await expect(switchToSingleType()).resolves.toBeUndefined();
    expect(builder.writeFiles).toHaveBeenCalledTimes(1);
  });
});
