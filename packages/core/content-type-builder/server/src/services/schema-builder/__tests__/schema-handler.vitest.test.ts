import { describe, it, expect, vi, beforeEach } from 'vitest';
import fse from 'fs-extra';

import createSchemaHandler from '../schema-handler';

vi.mock('fs-extra', () => ({
  default: {
    ensureFile: vi.fn(() => Promise.resolve()),
    writeJSON: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    readdir: vi.fn(() => Promise.resolve([])),
  },
}));

const indexes = [{ name: 'tests_slug_custom_idx', columns: ['slug'], type: null }];
const foreignKeys = [{ name: 'tests_author_fk', columns: ['author_id'] }];

const createTestHandler = (schemaOverrides: Record<string, unknown> = {}) =>
  createSchemaHandler({
    uid: 'api::test.test',
    dir: '/tmp/api/test/content-types/test',
    filename: 'schema.json',
    schema: {
      kind: 'collectionType',
      collectionName: 'tests',
      info: { singularName: 'test', pluralName: 'tests', displayName: 'test' },
      options: { draftAndPublish: true },
      pluginOptions: {},
      attributes: {
        test: { type: 'string' },
        slug: { type: 'uid', targetField: 'test' },
      },
      ...schemaOverrides,
    } as any,
  });

describe('schema-handler flush', () => {
  beforeEach(() => {
    vi.mocked(fse.ensureFile).mockClear();
    vi.mocked(fse.writeJSON).mockClear();
  });

  it('writes experimental indexes and foreignKeys when saving an unrelated change', async () => {
    const handler = createTestHandler({ indexes, foreignKeys });

    handler.setAttribute('extra', { type: 'string' });
    await handler.flush();

    expect(fse.writeJSON).toHaveBeenCalledTimes(1);
    expect(vi.mocked(fse.writeJSON).mock.calls[0][1]).toMatchObject({
      collectionName: 'tests',
      attributes: expect.objectContaining({ extra: { type: 'string' } }),
      indexes,
      foreignKeys,
    });
  });

  it('does not invent indexes or foreignKeys when the schema has none', async () => {
    const handler = createTestHandler();

    handler.setAttribute('extra', { type: 'string' });
    await handler.flush();

    const written = vi.mocked(fse.writeJSON).mock.calls[0][1] as Record<string, unknown>;

    expect(written.indexes).toBeUndefined();
    expect(written.foreignKeys).toBeUndefined();
  });
});
