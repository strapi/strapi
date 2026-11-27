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

  it('tolerates an already-removed directory while rolling back a newly created schema', async () => {
    const handler = createSchemaHandler({
      uid: 'api::new.new',
      isNew: true,
      dir: '/tmp/api/new/content-types/new',
      filename: 'schema.json',
    });
    vi.mocked(fse.readdir).mockRejectedValueOnce(
      Object.assign(new Error('missing'), { code: 'ENOENT' })
    );

    await expect(handler.rollback()).resolves.toBeUndefined();
  });
});

describe('schema-handler rollback', () => {
  beforeEach(() => {
    vi.mocked(fse.ensureFile).mockClear();
    vi.mocked(fse.writeJSON).mockClear();
    vi.mocked(fse.remove).mockClear();
  });

  it('removes the written file of a newly created schema', async () => {
    const handler = createSchemaHandler({
      uid: 'api::new.new',
      isNew: true,
      dir: '/tmp/api/new/content-types/new',
      filename: 'schema.json',
    });
    handler.set('collectionName', 'news');

    await handler.rollback();

    expect(fse.remove).toHaveBeenCalledWith('/tmp/api/new/content-types/new/schema.json');
    expect(fse.writeJSON).not.toHaveBeenCalled();
  });

  it('restores the initial schema of an existing schema', async () => {
    const handler = createTestHandler();
    handler.setAttribute('extra', { type: 'string' });
    await handler.flush();

    await handler.rollback();

    // the edit, then the rollback
    expect(fse.writeJSON).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fse.writeJSON).mock.calls[1][0]).toBe(
      '/tmp/api/test/content-types/test/schema.json'
    );
    expect(vi.mocked(fse.writeJSON).mock.calls[1][1]).not.toHaveProperty('attributes.extra');
  });

  it('restores the initial schema of an existing schema whose write failed', async () => {
    const handler = createTestHandler();
    handler.setAttribute('extra', { type: 'string' });
    vi.mocked(fse.writeJSON).mockRejectedValueOnce(new Error('EISDIR'));
    await expect(handler.flush()).rejects.toThrow('EISDIR');

    await handler.rollback();

    expect(fse.writeJSON).toHaveBeenCalledTimes(2);
    expect(vi.mocked(fse.writeJSON).mock.calls[1][1]).not.toHaveProperty('attributes.extra');
  });

  it('writes nothing for an edited schema that was not written', async () => {
    // A plugin content type has no file until a save writes its extension schema
    const handler = createSchemaHandler({
      uid: 'plugin::users-permissions.user',
      plugin: 'users-permissions',
      dir: '/tmp/extensions/users-permissions/content-types/user',
      filename: 'schema.json',
      schema: { info: {}, options: {}, attributes: {} } as any,
    });
    handler.setAttribute('articles', { type: 'relation', relation: 'oneToMany' });

    await handler.rollback();

    expect(fse.ensureFile).not.toHaveBeenCalled();
    expect(fse.writeJSON).not.toHaveBeenCalled();
    expect(fse.remove).not.toHaveBeenCalled();
  });
});
