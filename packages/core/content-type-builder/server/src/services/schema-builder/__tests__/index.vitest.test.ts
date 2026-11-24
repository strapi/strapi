import path from 'node:path';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import fse from 'fs-extra';

import createBuilder from '../index';

vi.mock('fs-extra', () => ({
  default: {
    ensureFile: vi.fn(() => Promise.resolve()),
    writeJSON: vi.fn(() => Promise.resolve()),
    remove: vi.fn(() => Promise.resolve()),
    readdir: vi.fn(() => Promise.resolve([])),
  },
}));

const COMPONENTS_DIR = '/app/src/components';
const EXTENSIONS_DIR = '/app/src/extensions';

const createComponent = (category: string, name: string) => {
  const schema = {
    collectionName: `components_${category}_${name}s`,
    info: { displayName: name, icon: 'star' },
    options: {},
    attributes: { title: { type: 'string' } },
  };

  return {
    ...schema,
    __schema__: schema,
    __filename__: `${name}.json`,
    uid: `${category}.${name}`,
    category,
    modelName: name,
  };
};

describe('createBuilder', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    (global as any).strapi = {
      dirs: {
        app: { components: COMPONENTS_DIR, extensions: EXTENSIONS_DIR, api: '/app/src/api' },
      },
      components: {
        'default.admin': createComponent('default', 'admin'),
      },
      contentTypes: {
        'admin::user': {
          modelName: 'user',
          plugin: 'admin',
          uid: 'admin::user',
          info: { singularName: 'user' },
          __schema__: { info: { singularName: 'user' }, options: {}, attributes: {} },
        },
      },
    };
  });

  it('writes the file of an existing component named "admin"', async () => {
    const builder = createBuilder();

    builder.editComponent({
      uid: 'default.admin',
      category: 'default',
      displayName: 'Admin Banner',
      icon: 'star',
      attributes: { title: { type: 'string' } },
    });

    await expect(builder.writeFiles()).resolves.toBe(true);

    expect(fse.writeJSON).toHaveBeenCalledWith(
      path.join(COMPONENTS_DIR, 'default', 'admin.json'),
      expect.objectContaining({ info: expect.objectContaining({ displayName: 'Admin Banner' }) }),
      expect.anything()
    );
  });

  describe('a failed write', () => {
    const cardPath = path.join(COMPONENTS_DIR, 'default', 'card.json');
    const freshPath = path.join(COMPONENTS_DIR, 'default', 'fresh.json');

    beforeEach(() => {
      const card = createComponent('default', 'card');

      (global as any).strapi.log = { error: vi.fn() };
      (global as any).strapi.telemetry = { send: vi.fn() };
      (global as any).strapi.components['default.card'] = {
        ...card,
        // The loader adds the file name to the loaded schema, as an enumerable key
        __schema__: { ...card.__schema__, __filename__: 'card.json' },
      };
    });

    afterEach(() => {
      vi.mocked(fse.writeJSON).mockImplementation(() => Promise.resolve());
      vi.mocked(fse.remove).mockImplementation(() => Promise.resolve());
    });

    it('restores the edited files without the __filename__ key of the loaded schema', async () => {
      vi.mocked(fse.writeJSON).mockImplementation(async (file) => {
        if (file === path.join(COMPONENTS_DIR, 'blocked', 'admin.json')) {
          throw new Error('EISDIR');
        }
      });

      const builder = createBuilder();
      builder.editComponent({
        uid: 'default.card',
        category: 'default',
        displayName: 'Card Renamed',
        icon: 'star',
        attributes: { title: { type: 'string' } },
      });
      builder.editComponent({
        uid: 'default.admin',
        category: 'blocked',
        displayName: 'admin',
        icon: 'star',
        attributes: { title: { type: 'string' } },
      });

      await expect(builder.writeFiles()).resolves.toBe(false);

      const cardWrites = vi.mocked(fse.writeJSON).mock.calls.filter(([file]) => file === cardPath);
      // the edit, then the rollback
      expect(cardWrites).toHaveLength(2);
      expect(cardWrites[1][1]).toEqual(createComponent('default', 'card').__schema__);
    });

    it('rolls back only once every file write has settled', async () => {
      const events: string[] = [];
      let finishFreshWrite = () => {};
      let cardWritten = false;

      vi.mocked(fse.writeJSON).mockImplementation(async (file) => {
        // the edit fails, the rollback succeeds
        if (file === cardPath && cardWritten === false) {
          cardWritten = true;
          throw new Error('EISDIR');
        }

        if (file === freshPath) {
          await new Promise<void>((resolve) => {
            finishFreshWrite = resolve;
          });
          events.push('fresh written');
        }
      });
      vi.mocked(fse.remove).mockImplementation(async (file) => {
        if (file === freshPath) {
          events.push('fresh removed');
        }
      });

      const builder = createBuilder();
      builder.editComponent({
        uid: 'default.card',
        category: 'default',
        displayName: 'Card Renamed',
        icon: 'star',
        attributes: { title: { type: 'string' } },
      });
      builder.createComponent({
        category: 'default',
        displayName: 'fresh',
        icon: 'star',
        attributes: { note: { type: 'text' } },
      });

      const written = builder.writeFiles();

      // Let the failed write reject while the new file is still being written
      await new Promise((resolve) => {
        setTimeout(resolve, 0);
      });
      finishFreshWrite();

      await expect(written).resolves.toBe(false);
      // the new file is removed after it was written, so it does not stay on disk
      expect(events).toEqual(['fresh written', 'fresh removed']);
    });
  });

  it('keeps the content types of the admin plugin not writable', () => {
    const builder = createBuilder();

    expect(builder.contentTypes.get('admin::user').writable).toBe(false);
  });

  describe('component uid change', () => {
    type RecordedUpdate = { table: string; oldUID: string; newUID: string };

    // A `*_cmps` join table attribute, as `@strapi/core` builds it for `component`
    // and `dynamiczone` attributes of content types and components.
    const cmpsAttribute = (name: string) => ({
      type: 'relation',
      joinTable: { name, pivotColumns: ['entity_id', 'cmp_id', 'field', 'component_type'] },
    });

    const createDb = () => {
      const updates: RecordedUpdate[] = [];

      const db = {
        metadata: new Map(
          Object.entries({
            'api::page.page': {
              attributes: {
                sections: cmpsAttribute('pages_cmps'),
                hero: cmpsAttribute('pages_cmps'),
              },
            },
            'default.wrapper': {
              attributes: { inner: cmpsAttribute('components_default_wrappers_cmps') },
            },
          })
        ),
        transaction: vi.fn(async (run: (args: { trx: unknown }) => Promise<unknown>) =>
          run({ trx: {} })
        ),
        getConnection: vi.fn((table: string) => ({
          where: (column: string, oldUID: string) => ({
            update: (values: Record<string, string>) => ({
              async transacting() {
                expect(column).toBe('component_type');
                updates.push({ table, oldUID, newUID: values[column] });
                return 1;
              },
            }),
          }),
        })),
      };

      return { db, updates };
    };

    const cardInfos = {
      uid: 'default.card',
      displayName: 'card',
      icon: 'star',
      attributes: { title: { type: 'string' } },
    };

    beforeEach(() => {
      (global as any).strapi.components['default.card'] = createComponent('default', 'card');
    });

    it('rewrites component_type in every component join table when the category changes', async () => {
      const { db, updates } = createDb();
      (global as any).strapi.db = db;

      const builder = createBuilder();
      builder.editComponent({ ...cardInfos, category: 'blocks' });

      await expect(builder.writeFiles()).resolves.toBe(true);

      expect(fse.writeJSON).toHaveBeenCalledWith(
        path.join(COMPONENTS_DIR, 'blocks', 'card.json'),
        expect.anything(),
        expect.anything()
      );
      expect(db.transaction).toHaveBeenCalledTimes(1);
      expect(updates).toEqual([
        { table: 'pages_cmps', oldUID: 'default.card', newUID: 'blocks.card' },
        {
          table: 'components_default_wrappers_cmps',
          oldUID: 'default.card',
          newUID: 'blocks.card',
        },
      ]);
    });

    it('writes only the files when asked to leave the rows to the caller', async () => {
      const { db, updates } = createDb();
      (global as any).strapi.db = db;

      const builder = createBuilder();
      builder.editComponent({ ...cardInfos, category: 'blocks' });

      await expect(builder.writeFiles({ renameComponentRows: false })).resolves.toBe(true);
      expect(db.transaction).not.toHaveBeenCalled();

      await builder.renameComponentRows();
      expect(updates).toHaveLength(2);
    });

    it('runs beforeCommit inside the row transaction, after the rewrite', async () => {
      const { db, updates } = createDb();
      (global as any).strapi.db = db;

      const builder = createBuilder();
      builder.editComponent({ ...cardInfos, category: 'blocks' });
      await builder.writeFiles({ renameComponentRows: false });

      const beforeCommit = vi.fn(async () => {
        expect(updates).toHaveLength(2);
      });

      await builder.renameComponentRows({ beforeCommit });

      expect(beforeCommit).toHaveBeenCalledTimes(1);
      expect(db.transaction).toHaveBeenCalledTimes(1);
    });

    it('rejects with the error of beforeCommit', async () => {
      const { db } = createDb();
      (global as any).strapi.db = db;

      const builder = createBuilder();
      builder.editComponent({ ...cardInfos, category: 'blocks' });
      await builder.writeFiles({ renameComponentRows: false });

      await expect(
        builder.renameComponentRows({
          async beforeCommit() {
            throw new Error('EISDIR');
          },
        })
      ).rejects.toThrow('EISDIR');
    });

    it('rolls the files back and rejects when the row rewrite fails', async () => {
      const { db } = createDb();
      db.transaction.mockRejectedValueOnce(new Error('SQLITE_BUSY'));
      (global as any).strapi.db = db;
      (global as any).strapi.log = { error: vi.fn() };

      const builder = createBuilder();
      const rollback = vi.spyOn(builder, 'rollback');
      builder.editComponent({ ...cardInfos, category: 'blocks' });

      await expect(builder.writeFiles()).rejects.toThrow('Invalid schema edition');

      expect(rollback).toHaveBeenCalledTimes(1);
      // the moved file is removed again
      expect(fse.remove).toHaveBeenCalledWith(path.join(COMPONENTS_DIR, 'blocks', 'card.json'));
    });

    it('issues no update when the category does not change', async () => {
      const { db, updates } = createDb();
      (global as any).strapi.db = db;

      const builder = createBuilder();
      builder.editComponent({ ...cardInfos, category: 'default', displayName: 'Card' });

      await expect(builder.writeFiles()).resolves.toBe(true);

      expect(db.transaction).not.toHaveBeenCalled();
      expect(updates).toEqual([]);
    });
  });
});
