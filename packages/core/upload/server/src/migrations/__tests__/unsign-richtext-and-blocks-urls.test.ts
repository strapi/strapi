import type { Database } from '@strapi/database';
import { unsignRichtextAndBlocksUrls } from '../unsign-richtext-and-blocks-urls';
import { getService } from '../../utils';

jest.mock('../../utils');

const BUCKET_URL = 'https://my-bucket.s3.eu-west-1.amazonaws.com';

/**
 * Mimics the real `signFileUrls`: `isUrlSigned` is set for every file of the
 * configured private provider, but the provider itself only rewrites URLs from
 * its own bucket and hands every other URL back untouched.
 */
const signFileUrls = jest.fn(async (file: any) => {
  const url = String(file.url ?? '');

  if (url.includes('boom')) {
    throw new Error('malformed value');
  }

  if (file.provider !== 'aws-s3') {
    return { ...file, isUrlSigned: false };
  }

  if (!url.startsWith(BUCKET_URL)) {
    return { ...file, isUrlSigned: true };
  }

  return { ...file, url: `${url.split('?')[0]}?signature=fresh`, isUrlSigned: true };
});

const imageNode = (url: string) => ({
  type: 'image',
  image: {
    hash: 'photo_abc123',
    ext: '.png',
    provider: 'aws-s3',
    url,
    formats: {
      thumbnail: { url: `${BUCKET_URL}/thumbnail_photo_abc123.png?X-Amz-Signature=expired` },
    },
    isUrlSigned: true,
  },
  children: [{ type: 'text', text: '' }],
});

const contentTypes = {
  'api::article.article': {
    uid: 'api::article.article',
    attributes: {
      title: { type: 'string' },
      body: { type: 'richtext' },
      content: { type: 'blocks' },
    },
  },
  'api::tag.tag': {
    uid: 'api::tag.tag',
    attributes: { name: { type: 'string' } },
  },
};

const components = {
  'default.section': {
    uid: 'default.section',
    attributes: { body: { type: 'richtext' } },
  },
};

const tableNames: Record<string, string> = {
  'api::article.article': 'articles',
  'api::tag.tag': 'tags',
  'default.section': 'components_default_sections',
};

type FakeDbOptions = {
  /** Columns that do not exist yet, as `uid.attribute` */
  missingColumns?: string[];
  /** Schemas whose `findMany` throws */
  failingUids?: string[];
};

const createFakeDb = (
  rowsByUid: Record<string, any[]>,
  { missingColumns = [], failingUids = [] }: FakeDbOptions = {}
) => {
  const update = jest.fn();
  const findMany = jest.fn();

  const query = jest.fn((uid: string) => ({
    async findMany({ select, limit, offset }: any) {
      findMany(uid, select);

      if (failingUids.includes(uid)) {
        throw new Error(`table ${tableNames[uid]} is broken`);
      }

      return (rowsByUid[uid] ?? [])
        .slice(offset, offset + limit)
        .map((row) => Object.fromEntries(select.map((key: string) => [key, row[key]])));
    },
    async update({ where, data }: any) {
      update(uid, where, data);

      const row = (rowsByUid[uid] ?? []).find((item) => item.id === where.id);
      Object.assign(row, data);
    },
  }));

  const uidByTable = Object.fromEntries(Object.entries(tableNames).map(([uid, t]) => [t, uid]));
  const schemas: Record<string, any> = { ...contentTypes, ...components };

  const db = {
    metadata: {
      has: (uid: string) => uid in tableNames,
      get: (uid: string) => ({
        tableName: tableNames[uid],
        attributes: Object.fromEntries(
          Object.keys(schemas[uid].attributes).map((name) => [name, { columnName: name }])
        ),
      }),
    },
    getSchemaConnection: () => ({
      hasTable: async (tableName: string) => Object.values(tableNames).includes(tableName),
      hasColumn: async (tableName: string, column: string) =>
        !missingColumns.includes(`${uidByTable[tableName]}.${column}`),
    }),
  } as unknown as Database;

  return { db, query, update, findMany };
};

const setupStrapi = ({ isPrivate = true, query }: { isPrivate?: boolean; query: jest.Mock }) => {
  global.strapi = {
    plugins: { upload: { provider: { isPrivate: jest.fn().mockResolvedValue(isPrivate) } } },
    config: { get: jest.fn(() => ({ provider: 'aws-s3' })) },
    contentTypes,
    components,
    db: { query },
    log: { warn: jest.fn(), info: jest.fn() },
  } as any;
};

describe('Upload | migrations | unsign-richtext-and-blocks-urls', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getService).mockImplementation(() => ({ signFileUrls }) as any);
  });

  test('rewrites signed richtext and blocks values to their unsigned form', async () => {
    const rows = {
      'api::article.article': [
        {
          id: 1,
          body: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)`,
          content: [imageNode(`${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired`)],
        },
      ],
    };
    const { db, query, update } = createFakeDb(rows);
    setupStrapi({ query });

    await unsignRichtextAndBlocksUrls.up(null as any, db);

    expect(rows['api::article.article'][0].body).toBe(`![alt](${BUCKET_URL}/photo_abc123.png)`);
    expect(rows['api::article.article'][0].content[0].image.url).toBe(
      `${BUCKET_URL}/photo_abc123.png`
    );
    expect(rows['api::article.article'][0].content[0].image.formats.thumbnail.url).toBe(
      `${BUCKET_URL}/thumbnail_photo_abc123.png`
    );
    expect(rows['api::article.article'][0].content[0].image).not.toHaveProperty('isUrlSigned');
    expect(update).toHaveBeenCalledTimes(1);
  });

  test('is idempotent: a second run writes nothing', async () => {
    const rows = {
      'api::article.article': [
        {
          id: 1,
          body: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)`,
          content: null,
        },
      ],
    };
    const { db, query, update } = createFakeDb(rows);
    setupStrapi({ query });

    await unsignRichtextAndBlocksUrls.up(null as any, db);
    expect(update).toHaveBeenCalledTimes(1);

    update.mockClear();
    await unsignRichtextAndBlocksUrls.up(null as any, db);
    expect(update).not.toHaveBeenCalled();
  });

  test('is a no-op when the provider is public', async () => {
    const { db, query } = createFakeDb({ 'api::article.article': [{ id: 1, body: 'x' }] });
    setupStrapi({ query, isPrivate: false });

    await unsignRichtextAndBlocksUrls.up(null as any, db);

    expect(query).not.toHaveBeenCalled();
  });

  test('leaves external and local urls untouched', async () => {
    const rows = {
      'api::article.article': [
        {
          id: 1,
          body:
            '![alt](https://example.com/photo.png?width=200) and ![local](/uploads/photo.png?v=1)' +
            ' and <img src="https://example.com/x.png?w=1">',
          content: null,
        },
      ],
    };
    const { db, query, update } = createFakeDb(rows);
    setupStrapi({ query });

    await unsignRichtextAndBlocksUrls.up(null as any, db);

    expect(update).not.toHaveBeenCalled();
  });

  test('rewrites raw html src urls in richtext', async () => {
    const rows = {
      'api::article.article': [
        {
          id: 1,
          body: `<img src="${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired" width="200">`,
          content: null,
        },
      ],
    };
    const { db, query } = createFakeDb(rows);
    setupStrapi({ query });

    await unsignRichtextAndBlocksUrls.up(null as any, db);

    expect(rows['api::article.article'][0].body).toBe(
      `<img src="${BUCKET_URL}/photo_abc123.png" width="200">`
    );
  });

  test('migrates component tables too, and skips schemas without richtext or blocks', async () => {
    const rows = {
      'default.section': [
        { id: 1, body: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)` },
      ],
    };
    const { db, query, update } = createFakeDb(rows);
    setupStrapi({ query });

    await unsignRichtextAndBlocksUrls.up(null as any, db);

    expect(rows['default.section'][0].body).toBe(`![alt](${BUCKET_URL}/photo_abc123.png)`);
    expect(update).toHaveBeenCalledWith('default.section', { id: 1 }, expect.anything());
    // `api::tag.tag` has no richtext / blocks attribute
    expect(query).not.toHaveBeenCalledWith('api::tag.tag');
  });

  test('warns and continues when a single value cannot be processed', async () => {
    const rows = {
      'api::article.article': [
        { id: 1, body: `![alt](${BUCKET_URL}/boom.png)`, content: null },
        {
          id: 2,
          body: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)`,
          content: null,
        },
      ],
    };
    const { db, query, update } = createFakeDb(rows);
    setupStrapi({ query });

    await unsignRichtextAndBlocksUrls.up(null as any, db);

    expect(global.strapi.log.warn).toHaveBeenCalledTimes(1);
    expect(update).toHaveBeenCalledTimes(1);
    expect(rows['api::article.article'][1].body).toBe(`![alt](${BUCKET_URL}/photo_abc123.png)`);
  });

  test('only selects the columns that already exist', async () => {
    const rows = {
      'api::article.article': [
        { id: 1, body: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)` },
      ],
    };
    const { db, query, update, findMany } = createFakeDb(rows, {
      missingColumns: ['api::article.article.content'],
    });
    setupStrapi({ query });

    await expect(unsignRichtextAndBlocksUrls.up(null as any, db)).resolves.toBeUndefined();

    expect(findMany).toHaveBeenCalledWith('api::article.article', ['id', 'body']);
    expect(update).toHaveBeenCalledWith(
      'api::article.article',
      { id: 1 },
      {
        body: `![alt](${BUCKET_URL}/photo_abc123.png)`,
      }
    );
    expect(global.strapi.log.warn).not.toHaveBeenCalled();
  });

  test('skips a schema when none of its columns exist yet', async () => {
    const { db, query, findMany } = createFakeDb(
      { 'default.section': [{ id: 1, body: 'x' }] },
      { missingColumns: ['default.section.body'] }
    );
    setupStrapi({ query });

    await unsignRichtextAndBlocksUrls.up(null as any, db);

    expect(findMany).not.toHaveBeenCalledWith('default.section', expect.anything());
  });

  test('warns and moves on to the next schema when a query fails', async () => {
    const rows = {
      'api::article.article': [
        { id: 1, body: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)` },
      ],
      'default.section': [
        { id: 1, body: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)` },
      ],
    };
    const { db, query, update } = createFakeDb(rows, { failingUids: ['api::article.article'] });
    setupStrapi({ query });

    await expect(unsignRichtextAndBlocksUrls.up(null as any, db)).resolves.toBeUndefined();

    expect(global.strapi.log.warn).toHaveBeenCalledTimes(1);
    expect(global.strapi.log.warn).toHaveBeenCalledWith(
      expect.stringContaining('Skipped api::article.article: table articles is broken')
    );
    expect(update).toHaveBeenCalledTimes(1);
    expect(rows['default.section'][0].body).toBe(`![alt](${BUCKET_URL}/photo_abc123.png)`);
  });
});
