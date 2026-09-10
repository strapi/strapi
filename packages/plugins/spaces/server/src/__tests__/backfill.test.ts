import { backfillLegacyRows, persistPluginTables } from '../backfill';
import { isUnscopedContext } from '../utils/space-scope';

const ARTICLE = { uid: 'api::article.article', pluginOptions: {} };
const GLOSSARY = {
  uid: 'api::glossary.glossary',
  pluginOptions: { spaces: { sharedEntries: true } },
};
const FILE = { uid: 'plugin::upload.file', pluginOptions: { spaces: { scope: 'space' } } };

interface Options {
  marker?: { stamped: string[] } | null;
  defaultSpace?: { id: number } | null;
  counts?: Record<string, number>;
  backfillConfig?: boolean;
}

const makeStrapi = ({
  marker = null,
  defaultSpace = { id: 1 },
  counts = {},
  backfillConfig,
}: Options = {}) => {
  const store = { get: jest.fn(async () => marker), set: jest.fn(async () => undefined) };
  const updateMany = jest.fn(async () => 0);
  const unscopedDuringUpdate: boolean[] = [];
  const updatedTables: string[] = [];
  const info = jest.fn();
  const tableOf = (uid: string) => uid.replace(/\W/g, '_');
  const strapi = {
    contentTypes: { [ARTICLE.uid]: ARTICLE, [GLOSSARY.uid]: GLOSSARY, [FILE.uid]: FILE },
    plugins: {
      spaces: {
        config: (key: string) => (key === 'backfill' ? backfillConfig : undefined),
        services: {
          'content-types': {
            getSpaceScopedContentTypes: (s: any) => Object.values(s.contentTypes),
          },
        },
      },
    },
    store: jest.fn(() => store),
    log: { info, warn: jest.fn() },
    db: {
      query: jest.fn(() => ({ findOne: jest.fn(async () => defaultSpace) })),
      metadata: {
        get: (uid: string) => ({
          tableName: tableOf(uid),
          attributes: { space: { joinColumn: { name: 'space_id' } } },
        }),
      },
      connection: jest.fn((tableName: string) => ({
        whereNull: (column: string) => ({
          update: async (data: any) => {
            unscopedDuringUpdate.push(isUnscopedContext());
            updatedTables.push(tableName);
            await updateMany({ tableName, column, data });
            const uid = Object.keys(counts).find((key) => tableOf(key) === tableName);
            return uid ? counts[uid] : 0;
          },
        }),
      })),
    },
  } as any;
  (global as any).strapi = strapi;
  return { strapi, store, updateMany, updatedTables, unscopedDuringUpdate, info };
};

describe('backfillLegacyRows', () => {
  it('attaches NULL rows of every scoped, non-shared model to default, once per model', async () => {
    const { strapi, store, updateMany, updatedTables, unscopedDuringUpdate, info } = makeStrapi({
      counts: { [ARTICLE.uid]: 3 },
    });

    await backfillLegacyRows(strapi);

    expect(updateMany).toHaveBeenCalledTimes(2);
    expect(updateMany).toHaveBeenCalledWith({
      tableName: 'api__article_article',
      column: 'space_id',
      data: { space_id: 1 },
    });
    expect(updatedTables).toEqual(['api__article_article', 'plugin__upload_file']);
    expect(unscopedDuringUpdate).toEqual([true, true]);
    expect(store.set).toHaveBeenLastCalledWith({
      key: 'backfill',
      value: { stamped: [ARTICLE.uid, FILE.uid] },
    });
    expect(info).toHaveBeenCalledWith(
      expect.stringContaining('3 legacy api::article.article rows')
    );
  });

  it('skips models already stamped and stamps the new ones', async () => {
    const { strapi, updateMany, updatedTables, store } = makeStrapi({
      marker: { stamped: [ARTICLE.uid] },
    });

    await backfillLegacyRows(strapi);

    expect(updateMany).toHaveBeenCalledTimes(1);
    expect(updatedTables).toEqual(['plugin__upload_file']);
    expect(store.set).toHaveBeenLastCalledWith({
      key: 'backfill',
      value: { stamped: [ARTICLE.uid, FILE.uid] },
    });
  });

  it('is a no-op when disabled by config or without a default workspace', async () => {
    const disabled = makeStrapi({ backfillConfig: false });
    await backfillLegacyRows(disabled.strapi);
    expect(disabled.updateMany).not.toHaveBeenCalled();

    const noDefault = makeStrapi({ defaultSpace: null });
    await backfillLegacyRows(noDefault.strapi);
    expect(noDefault.updateMany).not.toHaveBeenCalled();
    expect(noDefault.strapi.log.warn).toHaveBeenCalled();
  });
});

describe('persistPluginTables', () => {
  it('persists the spaces table and every visibility join table (EE service present)', async () => {
    const persistTables = jest.fn();
    const strapi = {
      service: () => ({ persistTables }),
      contentTypes: { 'admin::role': {}, 'api::article.article': {} },
      db: {
        metadata: {
          get: (uid: string) =>
            uid === 'admin::role'
              ? {
                  attributes: {
                    spaces: {
                      target: 'plugin::spaces.space',
                      joinTable: { name: 'admin_roles_spaces_lnk' },
                    },
                  },
                }
              : { attributes: { space: { target: 'plugin::spaces.space' } } },
        },
      },
    } as any;

    await persistPluginTables(strapi);

    expect(persistTables).toHaveBeenCalledWith(['spaces', 'admin_roles_spaces_lnk']);
  });

  it('is a no-op without the EE service', async () => {
    const strapi = { service: () => undefined } as any;

    await expect(persistPluginTables(strapi)).resolves.toBeUndefined();
  });
});
