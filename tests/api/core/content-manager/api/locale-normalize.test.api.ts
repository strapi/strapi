import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

/**
 * The content manager routes read the request locale with `getDocumentLocaleAndStatus`, which
 * accepts a string, `null`, an empty string, or no locale. A `null` or empty locale means "no
 * locale", so the routes pass it to the document service as `undefined`, like an absent one.
 *
 * For a localized type, i18n replaces a missing body locale with the default locale before the
 * route runs, so only the query locale of `findOne` can still be empty there.
 */
const PLAIN_UID = 'api::locale-norm-plain.locale-norm-plain';
const LOCALIZED_UID = 'api::locale-norm-localized.locale-norm-localized';
const UNIQUE_UID = 'api::locale-norm-unique.locale-norm-unique';

const plainModel = {
  kind: 'collectionType',
  displayName: 'Locale norm plain',
  singularName: 'locale-norm-plain',
  pluralName: 'locale-norm-plains',
  draftAndPublish: true,
  attributes: { title: { type: 'string' } },
};

const localizedModel = {
  kind: 'collectionType',
  displayName: 'Locale norm localized',
  singularName: 'locale-norm-localized',
  pluralName: 'locale-norm-localizeds',
  draftAndPublish: true,
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
  },
};

// Without draft and publish, every entry is published, so the unique check always runs
const uniqueModel = {
  kind: 'collectionType',
  displayName: 'Locale norm unique',
  singularName: 'locale-norm-unique',
  pluralName: 'locale-norm-uniques',
  draftAndPublish: false,
  attributes: { code: { type: 'string', unique: true } },
};

// The request locale: `undefined` means the request has no `locale`
type RequestLocale = string | null | undefined;
// A row: its `locale` column and whether it is the published version
type Row = [locale: string | null, status: 'draft' | 'published'];
// A document service call that has a `locale` param, and that param
type Call = [action: string, locale: unknown];

const variants: Array<[name: string, locale: RequestLocale]> = [
  ['absent', undefined],
  ['null', null],
  ['empty', ''],
  ['fr', 'fr'],
];

describe('CM API - request locale passed to the document service', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let rq: any;
  let calls: Call[] = [];

  beforeAll(async () => {
    await builder.addContentTypes([plainModel, localizedModel, uniqueModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: { code: 'fr', name: 'French (fr)', isDefault: false },
    });

    strapi.documents.use(async (ctx: any, next: () => Promise<unknown>) => {
      if ([PLAIN_UID, LOCALIZED_UID].includes(ctx.uid) && 'locale' in ctx.params) {
        calls.push([ctx.action, ctx.params.locale]);
      }
      return next();
    });
  });

  afterAll(async () => {
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
    await strapi.destroy();
    await builder.cleanup();
  });

  const rows = async (uid: string, documentId: string): Promise<Row[]> => {
    const entries = await strapi.db.query(uid).findMany({
      where: { documentId },
    });

    // Postgres sorts NULL publishedAt first on DESC. SQLite and MySQL sort it last.
    // Compare the stored rows in a fixed order instead of depending on that.
    return entries
      .map((entry: any): Row => [entry.locale, entry.publishedAt === null ? 'draft' : 'published'])
      .sort((left, right) => {
        if (left[0] !== right[0]) {
          if (left[0] === null) return -1;
          if (right[0] === null) return 1;
          return left[0] < right[0] ? -1 : 1;
        }

        if (left[1] === right[1]) return 0;
        return left[1] === 'published' ? -1 : 1;
      });
  };

  const withLocale = (body: Record<string, unknown>, locale: RequestLocale) =>
    locale === undefined ? body : { ...body, locale };

  // Sends a request and returns it with the distinct document service calls it made. Other
  // middlewares (e.g. EE review workflows) can repeat a lookup with the same locale.
  const send = async (request: Record<string, unknown>) => {
    calls = [];
    const res = await rq(request);
    const distinct = calls.filter(
      ([action, locale], index) =>
        calls.findIndex((call) => call[0] === action && call[1] === locale) === index
    );
    return { res, calls: distinct };
  };

  const createSource = async (uid: string) => {
    const source = await strapi.documents(uid).create({ data: { title: 'Source' } });
    if (uid === LOCALIZED_UID) {
      await strapi.documents(uid).update({
        documentId: source.documentId,
        locale: 'fr',
        data: { title: 'Source fr' },
      });
    }
    return source.documentId as string;
  };

  describe('non-localized content type', () => {
    const base = `/content-manager/collection-types/${PLAIN_UID}`;

    // The locale passed to the document service: a real locale is kept, any other is undefined
    const expectedLocale: Record<string, string | undefined> = {
      absent: undefined,
      null: undefined,
      empty: undefined,
      fr: 'fr',
    };
    // A non-localized entry has no locale: the body `locale` is never stored, and the writes
    // (create, update, clone) get no `locale` param, so `calls` does not list them
    const storedLocale = null;

    test.each(variants)('create, body locale %s', async (name, locale) => {
      const { res, calls } = await send({
        method: 'POST',
        url: base,
        body: withLocale({ title: 'Created' }, locale),
      });

      expect(res.statusCode).toBe(201);
      expect(calls).toEqual([]);
      expect(await rows(PLAIN_UID, res.body.data.documentId)).toEqual([[storedLocale, 'draft']]);
    });

    test.each(variants)('update, body locale %s', async (name, locale) => {
      const sourceId = await createSource(PLAIN_UID);
      const { res, calls } = await send({
        method: 'PUT',
        url: `${base}/${sourceId}`,
        body: withLocale({ title: 'Updated' }, locale),
      });

      expect(res.statusCode).toBe(200);
      expect(calls).toEqual([['findOne', expectedLocale[name]]]);
      expect(await rows(PLAIN_UID, sourceId)).toEqual([[storedLocale, 'draft']]);
    });

    test.each(variants)('clone, body locale %s', async (name, locale) => {
      const sourceId = await createSource(PLAIN_UID);
      const { res, calls } = await send({
        method: 'POST',
        url: `${base}/clone/${sourceId}`,
        body: withLocale({ title: 'Cloned' }, locale),
      });

      expect(res.statusCode).toBe(200);
      expect(calls).toEqual([['findOne', expectedLocale[name]]]);
      expect(await rows(PLAIN_UID, res.body.data.documentId)).toEqual([[storedLocale, 'draft']]);
    });

    // A query string cannot hold a null locale
    test.each(variants.filter(([name]) => name !== 'null'))(
      'findOne, query locale %s',
      async (name, locale) => {
        const sourceId = await createSource(PLAIN_UID);
        const query = locale === undefined ? '' : `?locale=${locale}`;
        const { res, calls } = await send({ method: 'GET', url: `${base}/${sourceId}${query}` });

        expect(res.statusCode).toBe(200);
        expect(calls).toEqual([['findOne', expectedLocale[name]]]);
        expect(res.body.data.documentId).toBe(sourceId);
        expect(res.body.data.locale).toBeNull();
      }
    );

    test.each(variants)('publish, body locale %s', async (name, locale) => {
      const sourceId = await createSource(PLAIN_UID);
      const { res, calls } = await send({
        method: 'POST',
        url: `${base}/${sourceId}/actions/publish`,
        body: withLocale({}, locale),
      });

      expect(res.statusCode).toBe(200);
      expect(calls).toEqual([
        ['findOne', expectedLocale[name]],
        ['publish', expectedLocale[name]],
      ]);
      expect(await rows(PLAIN_UID, sourceId)).toEqual([
        [storedLocale, 'published'],
        [storedLocale, 'draft'],
      ]);
    });
  });

  // The unique check of the entity validator filters on the locale param. A non-localized entry
  // stores no locale, so a body locale must not reach the document service as a param either.
  describe('non-localized content type, unique field', () => {
    const base = `/content-manager/collection-types/${UNIQUE_UID}`;

    const create = (code: string) =>
      rq({ method: 'POST', url: base, body: { code, locale: 'fr' } });

    const count = (code: string): Promise<number> =>
      strapi.db.query(UNIQUE_UID).count({ where: { code } });

    test('create, body locale fr, rejects a duplicate value', async () => {
      expect((await create('create-taken')).statusCode).toBe(201);

      const res = await create('create-taken');

      expect(res.statusCode).toBe(400);
      expect(await count('create-taken')).toBe(1);
    });

    test('update, body locale fr, rejects a duplicate value', async () => {
      expect((await create('update-taken')).statusCode).toBe(201);
      const other = await create('update-other');
      expect(other.statusCode).toBe(201);

      const res = await rq({
        method: 'PUT',
        url: `${base}/${other.body.data.documentId}`,
        body: { code: 'update-taken', locale: 'fr' },
      });

      expect(res.statusCode).toBe(400);
      expect(await count('update-taken')).toBe(1);
    });

    test('clone, body locale fr, rejects a duplicate value', async () => {
      expect((await create('clone-taken')).statusCode).toBe(201);
      const source = await create('clone-source');
      expect(source.statusCode).toBe(201);

      const res = await rq({
        method: 'POST',
        url: `${base}/clone/${source.body.data.documentId}`,
        body: { code: 'clone-taken', locale: 'fr' },
      });

      expect(res.statusCode).toBe(400);
      expect(await count('clone-taken')).toBe(1);
    });
  });

  describe('localized content type', () => {
    const base = `/content-manager/collection-types/${LOCALIZED_UID}`;

    // i18n sets the default locale on the body when it has no locale
    const bodyLocale: Record<string, string> = { absent: 'en', null: 'en', empty: 'en', fr: 'fr' };

    test.each(variants)('create, body locale %s', async (name, locale) => {
      const { res, calls } = await send({
        method: 'POST',
        url: base,
        body: withLocale({ title: 'Created' }, locale),
      });

      expect(res.statusCode).toBe(201);
      expect(calls).toEqual([['create', bodyLocale[name]]]);
      expect(await rows(LOCALIZED_UID, res.body.data.documentId)).toEqual([
        [bodyLocale[name], 'draft'],
      ]);
    });

    test.each(variants)('update, body locale %s', async (name, locale) => {
      const sourceId = await createSource(LOCALIZED_UID);
      const { res, calls } = await send({
        method: 'PUT',
        url: `${base}/${sourceId}`,
        body: withLocale({ title: 'Updated' }, locale),
      });

      expect(res.statusCode).toBe(200);
      expect(calls).toEqual([
        ['findOne', bodyLocale[name]],
        ['update', bodyLocale[name]],
      ]);
      expect(res.body.data).toMatchObject({ locale: bodyLocale[name], title: 'Updated' });
    });

    test.each(variants)('clone, body locale %s', async (name, locale) => {
      const sourceId = await createSource(LOCALIZED_UID);
      const { res, calls } = await send({
        method: 'POST',
        url: `${base}/clone/${sourceId}`,
        body: withLocale({ title: 'Cloned' }, locale),
      });

      expect(res.statusCode).toBe(200);
      expect(calls).toEqual([
        ['findOne', bodyLocale[name]],
        ['clone', bodyLocale[name]],
      ]);
      expect(await rows(LOCALIZED_UID, res.body.data.documentId)).toEqual([
        [bodyLocale[name], 'draft'],
      ]);
    });

    test.each(variants.filter(([name]) => name !== 'null'))(
      'findOne, query locale %s',
      async (name, locale) => {
        const sourceId = await createSource(LOCALIZED_UID);
        const query = locale === undefined ? '' : `?locale=${locale}`;
        const { res, calls } = await send({ method: 'GET', url: `${base}/${sourceId}${query}` });

        // The query locale is not filled by i18n: the document service applies the default one
        expect(res.statusCode).toBe(200);
        expect(calls).toEqual([['findOne', locale === 'fr' ? 'fr' : undefined]]);
        expect(res.body.data.locale).toBe(bodyLocale[name]);
      }
    );

    test.each(variants)('publish, body locale %s', async (name, locale) => {
      const sourceId = await createSource(LOCALIZED_UID);
      const { res, calls } = await send({
        method: 'POST',
        url: `${base}/${sourceId}/actions/publish`,
        body: withLocale({}, locale),
      });

      expect(res.statusCode).toBe(200);
      expect(calls).toEqual([
        ['findOne', bodyLocale[name]],
        ['update', bodyLocale[name]],
        ['publish', bodyLocale[name]],
      ]);
      expect(res.body.data).toMatchObject({ locale: bodyLocale[name] });
      expect(res.body.data.publishedAt).not.toBeNull();
    });
  });
});
