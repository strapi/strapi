import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';

/**
 * The admin clone route validates the body `locale` as a string, null, or absent. For a
 * non-localized content type, it does not fill it, so a request with `locale: null` used to reach
 * the document service `clone` as `locale: null`, a value its params do not allow.
 *
 * These tests check that a null body locale clones the same document as an absent one, through the
 * route and through the document service, and that the route passes no null locale to `clone`.
 */
const PLAIN_UID = 'api::clone-locale-plain.clone-locale-plain';
const TARGET_UID = 'api::clone-locale-target.clone-locale-target';
const LOCALIZED_UID = 'api::clone-locale-localized.clone-locale-localized';

const targetModel = {
  kind: 'collectionType',
  displayName: 'Clone locale target',
  singularName: 'clone-locale-target',
  pluralName: 'clone-locale-targets',
  draftAndPublish: false,
  attributes: {
    name: { type: 'string' },
  },
};

const localizedModel = {
  kind: 'collectionType',
  displayName: 'Clone locale localized',
  singularName: 'clone-locale-localized',
  pluralName: 'clone-locale-localizeds',
  draftAndPublish: true,
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
  },
};

const plainModel = {
  kind: 'collectionType',
  displayName: 'Clone locale plain',
  singularName: 'clone-locale-plain',
  pluralName: 'clone-locale-plains',
  draftAndPublish: true,
  attributes: {
    title: { type: 'string' },
    target: { type: 'relation', relation: 'manyToOne', target: TARGET_UID },
    localizedTarget: { type: 'relation', relation: 'manyToOne', target: LOCALIZED_UID },
  },
};

// The request body locales: `undefined` means the body has no `locale` key
type BodyLocale = string | null | undefined;

describe('CM API - clone with a null body locale', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let rq: any;
  // The `locale` param of each document service `clone` call
  let cloneLocales: unknown[] = [];

  const plainSnapshot = async (documentId: string) => {
    const rows = await strapi.db.query(PLAIN_UID).findMany({
      where: { documentId },
      populate: ['target', 'localizedTarget'],
      orderBy: { publishedAt: 'desc' },
    });

    return rows.map((row: any) => ({
      title: row.title,
      locale: row.locale,
      published: row.publishedAt !== null,
      target: row.target?.documentId ?? null,
      localizedTarget:
        row.localizedTarget === null
          ? null
          : { documentId: row.localizedTarget.documentId, locale: row.localizedTarget.locale },
    }));
  };

  const localizedSnapshot = async (documentId: string) => {
    const rows = await strapi.db.query(LOCALIZED_UID).findMany({
      where: { documentId },
      orderBy: [{ locale: 'asc' }, { publishedAt: 'desc' }],
    });

    return rows.map((row: any) => ({
      title: row.title,
      locale: row.locale,
      published: row.publishedAt !== null,
    }));
  };

  // The response document, without the fields that differ on every clone
  const responseData = (data: Record<string, unknown>) => {
    const { id, documentId, createdAt, updatedAt, ...rest } = data;
    return rest;
  };

  const cloneThroughRoute = async (uid: string, sourceId: string, locale: BodyLocale) => {
    const body: Record<string, unknown> = { title: 'Clone' };
    if (locale !== undefined) {
      body.locale = locale;
    }

    cloneLocales = [];
    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${uid}/clone/${sourceId}`,
      body,
    });

    return { res, cloneLocales };
  };

  let plainSourceId: string;
  let localizedSourceId: string;

  beforeAll(async () => {
    await builder.addContentTypes([targetModel, localizedModel, plainModel]).build();

    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: { code: 'fr', name: 'French (fr)', isDefault: false },
    });

    strapi.documents.use(async (ctx: any, next: () => Promise<unknown>) => {
      if (ctx.action === 'clone') {
        cloneLocales.push(ctx.params.locale);
      }
      return next();
    });

    const target = await strapi.documents(TARGET_UID).create({ data: { name: 'Target' } });

    const localizedSource = await strapi
      .documents(LOCALIZED_UID)
      .create({ data: { title: 'Source en' }, locale: 'en' });
    await strapi.documents(LOCALIZED_UID).update({
      documentId: localizedSource.documentId,
      data: { title: 'Source fr' },
      locale: 'fr',
    });
    await strapi
      .documents(LOCALIZED_UID)
      .publish({ documentId: localizedSource.documentId, locale: '*' });
    localizedSourceId = localizedSource.documentId;

    const plainSource = await strapi.documents(PLAIN_UID).create({
      data: {
        title: 'Source',
        target: target.documentId,
        localizedTarget: { documentId: localizedSource.documentId, locale: 'fr' },
      },
    });
    await strapi.documents(PLAIN_UID).publish({ documentId: plainSource.documentId });
    plainSourceId = plainSource.documentId;
  });

  afterAll(async () => {
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('non-localized content type', () => {
    test('a null body locale clones the same document as an absent one', async () => {
      const results = [];
      for (const locale of [undefined, null]) {
        const { res, cloneLocales: locales } = await cloneThroughRoute(
          PLAIN_UID,
          plainSourceId,
          locale
        );
        results.push({
          status: res.statusCode,
          data: responseData(res.body.data),
          rows: await plainSnapshot(res.body.data.documentId),
          cloneLocales: locales,
        });
      }

      const [absent, nullLocale] = results;

      expect(absent.status).toBe(200);
      expect(nullLocale.status).toBe(200);
      expect(nullLocale.data).toEqual(absent.data);
      expect(nullLocale.rows).toEqual(absent.rows);
      // DP: only the draft is cloned, with the source relations
      expect(absent.rows).toHaveLength(1);
      expect(absent.rows[0]).toMatchObject({
        title: 'Clone',
        published: false,
        target: expect.any(String),
        localizedTarget: { documentId: localizedSourceId, locale: 'fr' },
      });
    });

    test('a null body locale reaches the document service clone as undefined', async () => {
      const { res, cloneLocales: locales } = await cloneThroughRoute(
        PLAIN_UID,
        plainSourceId,
        null
      );

      expect(res.statusCode).toBe(200);
      expect(locales).toEqual([undefined]);
    });
  });

  describe('localized content type', () => {
    test('a null body locale clones the default locale, like an absent one', async () => {
      const results = [];
      for (const locale of [undefined, null, 'fr']) {
        const { res, cloneLocales: locales } = await cloneThroughRoute(
          LOCALIZED_UID,
          localizedSourceId,
          locale
        );
        results.push({
          status: res.statusCode,
          data: responseData(res.body.data),
          rows: await localizedSnapshot(res.body.data.documentId),
          cloneLocales: locales,
        });
      }

      const [absent, nullLocale, fr] = results;

      expect(absent.status).toBe(200);
      expect(nullLocale.status).toBe(200);
      expect(nullLocale.data).toEqual(absent.data);
      expect(nullLocale.rows).toEqual(absent.rows);
      expect(absent.rows).toEqual([{ title: 'Clone', locale: 'en', published: false }]);
      expect(nullLocale.cloneLocales).toEqual(['en']);
      expect(fr.status).toBe(200);
      expect(fr.rows).toEqual([{ title: 'Clone', locale: 'fr', published: false }]);
    });
  });

  describe('document service', () => {
    test('clone of a non-localized document is the same with a null or undefined locale', async () => {
      const variants = {
        omitted: { data: { title: 'Clone' } },
        undefined: { data: { title: 'Clone' }, locale: undefined },
        null: { data: { title: 'Clone' }, locale: null },
        nullInData: { data: { title: 'Clone', locale: null }, locale: null },
      };

      const results: Record<string, unknown> = {};
      for (const [name, params] of Object.entries(variants)) {
        const result = await strapi.documents(PLAIN_UID).clone({
          ...params,
          documentId: plainSourceId,
        });
        results[name] = {
          entries: result.entries.length,
          rows: await plainSnapshot(result.documentId),
        };
      }

      expect(results.undefined).toEqual(results.omitted);
      expect(results.null).toEqual(results.omitted);
      expect(results.nullInData).toEqual(results.omitted);
    });
  });
});
