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
    await builder.addContentTypes([plainModel, localizedModel]).build();

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
      orderBy: [{ locale: 'asc' }, { publishedAt: 'desc' }],
    });

    return entries.map((entry: any) => [
      entry.locale,
      entry.publishedAt === null ? 'draft' : 'published',
    ]);
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
    // The body `locale` is kept in the data of create and update, so an empty one is stored
    const storedLocale: Record<string, string | null> = {
      absent: null,
      null: null,
      empty: '',
      fr: 'fr',
    };

    test.each(variants)('create, body locale %s', async (name, locale) => {
      const { res, calls } = await send({
        method: 'POST',
        url: base,
        body: withLocale({ title: 'Created' }, locale),
      });

      expect(res.statusCode).toBe(201);
      expect(calls).toEqual([['create', expectedLocale[name]]]);
      expect(await rows(PLAIN_UID, res.body.data.documentId)).toEqual([
        [storedLocale[name], 'draft'],
      ]);
    });

    test.each(variants)('update, body locale %s', async (name, locale) => {
      const sourceId = await createSource(PLAIN_UID);
      const { res, calls } = await send({
        method: 'PUT',
        url: `${base}/${sourceId}`,
        body: withLocale({ title: 'Updated' }, locale),
      });

      expect(res.statusCode).toBe(200);
      expect(calls).toEqual([
        ['findOne', expectedLocale[name]],
        ['update', expectedLocale[name]],
      ]);
      expect(await rows(PLAIN_UID, sourceId)).toEqual([[storedLocale[name], 'draft']]);
    });

    test.each(variants)('clone, body locale %s', async (name, locale) => {
      const sourceId = await createSource(PLAIN_UID);
      const { res, calls } = await send({
        method: 'POST',
        url: `${base}/clone/${sourceId}`,
        body: withLocale({ title: 'Cloned' }, locale),
      });

      expect(res.statusCode).toBe(200);
      expect(calls).toEqual([
        ['findOne', expectedLocale[name]],
        ['clone', expectedLocale[name]],
      ]);
      // Without a locale, the clone keeps the locale of the source row
      expect(await rows(PLAIN_UID, res.body.data.documentId)).toEqual([
        [name === 'fr' ? 'fr' : null, 'draft'],
      ]);
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
        ['update', expectedLocale[name]],
        ['publish', expectedLocale[name]],
      ]);
      expect(await rows(PLAIN_UID, sourceId)).toEqual([
        [storedLocale[name], 'published'],
        [storedLocale[name], 'draft'],
      ]);
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
