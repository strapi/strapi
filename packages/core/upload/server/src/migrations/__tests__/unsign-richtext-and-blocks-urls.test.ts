import type { Database } from '@strapi/database';
import { unsignRichtextAndBlocksUrls } from '../unsign-richtext-and-blocks-urls';
import { getService } from '../../utils';

jest.mock('../../utils');

const BUCKET_URL = 'https://my-bucket.s3.eu-west-1.amazonaws.com';
const FRESH_SIGNATURE = 'X-Amz-Signature=fresh&X-Amz-Expires=900';

/** The transaction the migration runner hands to `up` */
const trx = { schema: {} } as any;

/**
 * Mimics the real `signFileUrls`: `isUrlSigned` is set for every file of the
 * configured private provider, on the file and on each format, but the
 * provider itself only rewrites URLs from its own bucket and hands every other
 * URL back untouched.
 */
const signFileUrls = jest.fn(async (file: any) => {
  const url = String(file.url ?? '');

  if (url.includes('boom')) {
    throw new Error('malformed value');
  }

  if (file.provider !== 'aws-s3') {
    return { ...file, isUrlSigned: false };
  }

  const sign = (value: string) =>
    value.startsWith(`${BUCKET_URL}/`) ? `${value.split('?')[0]}?${FRESH_SIGNATURE}` : value;

  const signed = { ...file, url: sign(url), isUrlSigned: true };

  if (file.formats) {
    signed.formats = Object.fromEntries(
      Object.entries(file.formats).map(([key, format]: [string, any]) => [
        key,
        { ...format, url: sign(format.url), isUrlSigned: true },
      ])
    );
  }

  return signed;
});

const imageNode = (url: string) => ({
  type: 'image',
  image: {
    hash: 'photo_abc123',
    ext: '.png',
    provider: 'aws-s3',
    url,
    formats: {
      thumbnail: {
        url: `${BUCKET_URL}/thumbnail_photo_abc123.png?X-Amz-Signature=expired`,
        isUrlSigned: true,
      },
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

  const getSchemaConnection = jest.fn(() => ({
    hasTable: async (tableName: string) => Object.values(tableNames).includes(tableName),
    hasColumn: async (tableName: string, column: string) =>
      !missingColumns.includes(`${uidByTable[tableName]}.${column}`),
  }));

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
    getSchemaConnection,
  } as unknown as Database;

  return { db, query, update, findMany, getSchemaConnection };
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

    await unsignRichtextAndBlocksUrls.up(trx, db);

    expect(rows['api::article.article'][0].body).toBe(`![alt](${BUCKET_URL}/photo_abc123.png)`);
    expect(rows['api::article.article'][0].content[0].image.url).toBe(
      `${BUCKET_URL}/photo_abc123.png`
    );
    expect(rows['api::article.article'][0].content[0].image.formats.thumbnail.url).toBe(
      `${BUCKET_URL}/thumbnail_photo_abc123.png`
    );
    expect(rows['api::article.article'][0].content[0].image).not.toHaveProperty('isUrlSigned');
    expect(rows['api::article.article'][0].content[0].image.formats.thumbnail).not.toHaveProperty(
      'isUrlSigned'
    );
    expect(update).toHaveBeenCalledTimes(1);
  });

  test('drops isUrlSigned from a format whose url is already bare', async () => {
    // The state an earlier version of the fix left behind
    const node = imageNode(`${BUCKET_URL}/photo_abc123.png`);
    delete (node.image as Partial<typeof node.image>).isUrlSigned;
    node.image.formats.thumbnail.url = `${BUCKET_URL}/thumbnail_photo_abc123.png`;

    const rows = { 'api::article.article': [{ id: 1, body: null, content: [node] }] };
    const { db, query, update } = createFakeDb(rows);
    setupStrapi({ query });

    await unsignRichtextAndBlocksUrls.up(trx, db);

    expect(update).toHaveBeenCalledTimes(1);
    expect(rows['api::article.article'][0].content[0].image.formats.thumbnail).toEqual({
      url: `${BUCKET_URL}/thumbnail_photo_abc123.png`,
    });
  });

  test('removes only the signature parameters and keeps the others', async () => {
    const rows = {
      'api::article.article': [
        {
          id: 1,
          body: `![alt](${BUCKET_URL}/photo_abc123.png?width=200&X-Amz-Signature=expired)`,
          content: null,
        },
      ],
    };
    const { db, query } = createFakeDb(rows);
    setupStrapi({ query });

    await unsignRichtextAndBlocksUrls.up(trx, db);

    expect(rows['api::article.article'][0].body).toBe(
      `![alt](${BUCKET_URL}/photo_abc123.png?width=200)`
    );
  });

  test('presigns each distinct url once per run', async () => {
    const body = `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)`;
    const rows = {
      'api::article.article': [
        { id: 1, body, content: null },
        { id: 2, body, content: null },
        { id: 3, body, content: null },
      ],
      'default.section': [{ id: 1, body }],
    };
    const { db, query, update } = createFakeDb(rows);
    setupStrapi({ query });

    await unsignRichtextAndBlocksUrls.up(trx, db);

    expect(update).toHaveBeenCalledTimes(4);
    expect(signFileUrls).toHaveBeenCalledTimes(1);
  });

  test('logs the rows scanned and updated per schema, and a total', async () => {
    const rows = {
      'api::article.article': [
        { id: 1, body: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)` },
        { id: 2, body: 'nothing to do here' },
      ],
      'default.section': [{ id: 1, body: 'nothing to do here either' }],
    };
    const { db, query } = createFakeDb(rows);
    setupStrapi({ query });

    await unsignRichtextAndBlocksUrls.up(trx, db);

    expect(global.strapi.log.info).toHaveBeenCalledWith(
      '[unsign-richtext-and-blocks-urls] api::article.article: 2 rows scanned, 1 updated'
    );
    expect(global.strapi.log.info).toHaveBeenCalledWith(
      '[unsign-richtext-and-blocks-urls] default.section: 1 rows scanned, 0 updated'
    );
    expect(global.strapi.log.info).toHaveBeenLastCalledWith(
      '[unsign-richtext-and-blocks-urls] Done: 3 rows scanned, 1 updated'
    );
    // `api::tag.tag` has no richtext / blocks attribute, so it is not reported
    expect(global.strapi.log.info).toHaveBeenCalledTimes(3);
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

    await unsignRichtextAndBlocksUrls.up(trx, db);
    expect(update).toHaveBeenCalledTimes(1);

    update.mockClear();
    await unsignRichtextAndBlocksUrls.up(trx, db);
    expect(update).not.toHaveBeenCalled();
  });

  test('is a no-op when the provider is public', async () => {
    const { db, query } = createFakeDb({ 'api::article.article': [{ id: 1, body: 'x' }] });
    setupStrapi({ query, isPrivate: false });

    await unsignRichtextAndBlocksUrls.up(trx, db);

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

    await unsignRichtextAndBlocksUrls.up(trx, db);

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

    await unsignRichtextAndBlocksUrls.up(trx, db);

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

    await unsignRichtextAndBlocksUrls.up(trx, db);

    expect(rows['default.section'][0].body).toBe(`![alt](${BUCKET_URL}/photo_abc123.png)`);
    expect(update).toHaveBeenCalledWith('default.section', { id: 1 }, expect.anything());
    // `api::tag.tag` has no richtext / blocks attribute
    expect(query).not.toHaveBeenCalledWith('api::tag.tag');
  });

  test('warns and continues when a single value cannot be processed', async () => {
    const rows = {
      'api::article.article': [
        { id: 1, body: `![alt](${BUCKET_URL}/boom.png?X-Amz-Signature=expired)`, content: null },
        {
          id: 2,
          body: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)`,
          content: null,
        },
      ],
    };
    const { db, query, update } = createFakeDb(rows);
    setupStrapi({ query });

    await unsignRichtextAndBlocksUrls.up(trx, db);

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

    await expect(unsignRichtextAndBlocksUrls.up(trx, db)).resolves.toBeUndefined();

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

  test('runs the schema checks on the migration transaction', async () => {
    const rows = {
      'api::article.article': [
        { id: 1, body: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)` },
      ],
    };
    const { db, query, getSchemaConnection } = createFakeDb(rows);
    setupStrapi({ query });

    await unsignRichtextAndBlocksUrls.up(trx, db);

    // A call with no argument falls back to the root connection, which on SQLite
    // waits on the single pooled connection the transaction already holds
    expect(getSchemaConnection).toHaveBeenCalled();
    expect(getSchemaConnection).not.toHaveBeenCalledWith();
    getSchemaConnection.mock.calls.forEach((call) => expect(call).toEqual([trx]));
  });

  test('skips a schema when none of its columns exist yet', async () => {
    const { db, query, findMany } = createFakeDb(
      { 'default.section': [{ id: 1, body: 'x' }] },
      { missingColumns: ['default.section.body'] }
    );
    setupStrapi({ query });

    await unsignRichtextAndBlocksUrls.up(trx, db);

    expect(findMany).not.toHaveBeenCalledWith('default.section', expect.anything());
  });

  test('propagates a database error instead of skipping the table', async () => {
    const rows = {
      'api::article.article': [
        { id: 1, body: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)` },
      ],
    };
    const { db, query, update } = createFakeDb(rows, { failingUids: ['api::article.article'] });
    setupStrapi({ query });

    await expect(unsignRichtextAndBlocksUrls.up(trx, db)).rejects.toThrow(
      'table articles is broken'
    );

    expect(update).not.toHaveBeenCalled();
    expect(global.strapi.log.warn).not.toHaveBeenCalled();
  });
});
