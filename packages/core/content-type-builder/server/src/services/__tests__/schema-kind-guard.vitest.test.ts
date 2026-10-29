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

type Row = { documentId: string; locale?: string; publishedAt: string | null };
type Where = { documentId?: { $ne: string } };

const uid = 'api::article.article';

const mockRows = (rows: Row[]) => {
  const matches = (row: Row, where?: Where) =>
    where?.documentId === undefined || row.documentId !== where.documentId.$ne;

  strapi.db.query = vi.fn(() => ({
    count: vi.fn(async (params?: { where?: Where }) => {
      return rows.filter((row) => matches(row, params?.where)).length;
    }),
    findOne: vi.fn(async () => rows[0] ?? null),
  })) as any;
};

const saveWithKind = (kind: 'collectionType' | 'singleType') =>
  updateSchema({
    contentTypes: [
      {
        action: 'update',
        uid,
        displayName: 'Article',
        kind,
        draftAndPublish: true,
        pluginOptions: {},
        options: {},
        attributes: [],
      },
    ],
    components: [],
  } as unknown as CTBSchema);

const switchToSingleType = () => saveWithKind('singleType');

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

  it('skips the guard when a collection type stays a collection type', async () => {
    mockRows([
      { documentId: 'doc-1', publishedAt: null },
      { documentId: 'doc-2', publishedAt: null },
    ]);

    await expect(saveWithKind('collectionType')).resolves.toBeUndefined();
    expect(strapi.db.query).not.toHaveBeenCalled();
    expect(builder.writeFiles).toHaveBeenCalledTimes(1);
  });

  it('skips the guard when a single type stays a single type', async () => {
    strapi.contentTypes[uid].kind = 'singleType';
    mockRows([
      { documentId: 'doc-1', publishedAt: null },
      { documentId: 'doc-2', publishedAt: null },
    ]);

    await expect(switchToSingleType()).resolves.toBeUndefined();
    expect(strapi.db.query).not.toHaveBeenCalled();
    expect(builder.writeFiles).toHaveBeenCalledTimes(1);
  });
});
