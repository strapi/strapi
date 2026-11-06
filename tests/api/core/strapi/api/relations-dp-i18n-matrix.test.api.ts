/**
 * CMS-277: relations across Draft & Publish / i18n combinations.
 *
 * For each combination of a Left content type (the side that owns the relation) and a Right
 * content type, link Left -> Right through the REST API, check the Right side, publish Left and
 * then disconnect, checking both sides at each step.
 *
 * Every Left type has:
 * - `oneWay`: a unidirectional oneToOne relation to its Right type
 * - `twoWay`: a bidirectional manyToMany relation to its Right type (inverse: `Right.lefts`)
 */
import type { UID } from '@strapi/types';
import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createContentAPIRequest } from 'api-tests/request';

let strapi;
let rq;

type Options = { dp: boolean; i18n: boolean };

const localized = (i18n: boolean) => (i18n ? { pluginOptions: { i18n: { localized: true } } } : {});

const rightModel = (name: string, opts: Options) => ({
  singularName: name,
  pluralName: `${name}s`,
  displayName: name,
  draftAndPublish: opts.dp,
  ...localized(opts.i18n),
  attributes: {
    name: { type: 'string', ...localized(opts.i18n) },
  },
});

const leftModel = (name: string, right: string, opts: Options) => ({
  singularName: name,
  pluralName: `${name}s`,
  displayName: name,
  draftAndPublish: opts.dp,
  ...localized(opts.i18n),
  attributes: {
    name: { type: 'string', ...localized(opts.i18n) },
    oneWay: {
      type: 'relation',
      relation: 'oneToOne',
      target: `api::${right}.${right}`,
    },
    twoWay: {
      type: 'relation',
      relation: 'manyToMany',
      target: `api::${right}.${right}`,
      targetAttribute: 'lefts',
    },
  },
});

const PAIRS = {
  dp: { left: 'dp-left', right: 'dp-right', leftOpts: { dp: true, i18n: false } },
  loc: { left: 'loc-left', right: 'loc-right', leftOpts: { dp: true, i18n: true } },
  locToPlain: {
    left: 'loc-plain-left',
    right: 'loc-plain-right',
    leftOpts: { dp: true, i18n: true },
  },
  dpToPlain: {
    left: 'dp-plain-left',
    right: 'dp-plain-right',
    leftOpts: { dp: true, i18n: false },
  },
} as const;

const models = [
  rightModel('dp-right', { dp: true, i18n: false }),
  leftModel('dp-left', 'dp-right', PAIRS.dp.leftOpts),
  rightModel('loc-right', { dp: true, i18n: true }),
  leftModel('loc-left', 'loc-right', PAIRS.loc.leftOpts),
  rightModel('loc-plain-right', { dp: false, i18n: false }),
  leftModel('loc-plain-left', 'loc-plain-right', PAIRS.locToPlain.leftOpts),
  rightModel('dp-plain-right', { dp: false, i18n: false }),
  leftModel('dp-plain-left', 'dp-plain-right', PAIRS.dpToPlain.leftOpts),
];

type Query = { status?: 'draft' | 'published'; locale?: string };

const uid = (name: string) => `api::${name}.${name}` as UID.ContentType;
const isLeft = (name: string) => name.endsWith('-left');
const populateFor = (name: string) => (isLeft(name) ? ['oneWay', 'twoWay'] : ['lefts']);
const hasDraftAndPublish = (name: string) => !name.endsWith('plain-right');

// REST writes publish by default, so ask for a draft on D&P types and publish explicitly
const writeQuery = (name: string, locale?: string) => ({
  ...(hasDraftAndPublish(name) ? { status: 'draft' } : {}),
  ...(locale ? { locale } : {}),
});

const create = async (name: string, data: Record<string, unknown>, locale?: string) => {
  const { body, status } = await rq({
    method: 'POST',
    url: `/${name}s`,
    qs: writeQuery(name, locale),
    body: { data },
  });
  expect(status).toBe(201);
  return body.data;
};

// Also used to create a new locale of an existing document
const update = async (
  name: string,
  documentId: string,
  data: Record<string, unknown>,
  locale?: string
) => {
  const { body, status } = await rq({
    method: 'PUT',
    url: `/${name}s/${documentId}`,
    qs: writeQuery(name, locale),
    body: { data },
  });
  expect(status).toBe(200);
  return body.data;
};

const remove = async (name: string, documentId: string, locale?: string) => {
  const { status } = await rq({
    method: 'DELETE',
    url: `/${name}s/${documentId}`,
    qs: locale ? { locale } : {},
  });
  expect(status).toBe(204);
};

const get = async (name: string, documentId: string, query: Query = {}) => {
  const { body, status } = await rq({
    method: 'GET',
    url: `/${name}s/${documentId}`,
    qs: { status: query.status ?? 'draft', locale: query.locale, populate: populateFor(name) },
  });
  return status === 404 ? null : body.data;
};

// The content API has no publish action, so publish through the Document Service
const publish = (name: string, documentId: string, locale?: string) =>
  strapi.documents(uid(name)).publish({ documentId, locale });

const unpublish = (name: string, documentId: string, locale?: string) =>
  strapi.documents(uid(name)).unpublish({ documentId, locale });

type Entry = { documentId: string; locale?: string } | null | undefined;

const ref = (entry: Entry) =>
  entry ? { documentId: entry.documentId, locale: entry.locale } : null;
const refs = (entries: Entry[] | undefined) =>
  (entries ?? [])
    .map(ref)
    .sort((a, b) => `${a!.documentId}${a!.locale}`.localeCompare(`${b!.documentId}${b!.locale}`));
const ids = (entries: Entry[] | undefined) => (entries ?? []).map((e) => e!.documentId).sort();

describe('Relations across D&P / i18n combinations (CMS-277)', () => {
  const builder = createTestBuilder();

  beforeAll(async () => {
    await builder
      .addContentTypes(models)
      .addFixtures('plugin::i18n.locale', [{ name: 'Fr', code: 'fr' }])
      .build();
    strapi = await createStrapiInstance();
    rq = await createContentAPIRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
    await strapi.destroy();
    await builder.cleanup();
  });

  describe('D&P -> D&P', () => {
    const { left: L, right: R } = PAIRS.dp;

    const setup = async () => {
      const right = await create(R, { name: 'R' });
      const left = await create(L, {
        name: 'L',
        oneWay: { connect: [right.documentId] },
        twoWay: { connect: [right.documentId] },
      });
      return { left, right };
    };

    test('draft -> draft: the relation exists on both draft sides and nothing is published', async () => {
      const { left, right } = await setup();

      const leftDraft = await get(L, left.documentId);
      expect(leftDraft.oneWay?.documentId).toBe(right.documentId);
      expect(ids(leftDraft.twoWay)).toEqual([right.documentId]);
      expect(ids((await get(R, right.documentId)).lefts)).toEqual([left.documentId]);

      expect(await get(L, left.documentId, { status: 'published' })).toBeNull();
      expect(await get(R, right.documentId, { status: 'published' })).toBeNull();
    });

    test('published -> draft: publishing Left alone does not expose the draft-only Right', async () => {
      const { left, right } = await setup();

      await publish(L, left.documentId);

      const leftPublished = await get(L, left.documentId, { status: 'published' });
      expect(leftPublished.oneWay).toBeNull();
      expect(leftPublished.twoWay).toEqual([]);

      // the draft keeps the link
      expect((await get(L, left.documentId)).oneWay?.documentId).toBe(right.documentId);
    });

    test('draft -> published: publishing Right alone keeps the published Right unlinked', async () => {
      const { left, right } = await setup();

      await publish(R, right.documentId);

      expect((await get(R, right.documentId, { status: 'published' })).lefts).toEqual([]);
      expect(ids((await get(R, right.documentId)).lefts)).toEqual([left.documentId]);
    });

    test('published -> published: publishing Right then Left links both published sides', async () => {
      const { left, right } = await setup();

      await publish(R, right.documentId);
      await publish(L, left.documentId);

      const leftPublished = await get(L, left.documentId, { status: 'published' });
      expect(leftPublished.oneWay?.documentId).toBe(right.documentId);
      expect(ids(leftPublished.twoWay)).toEqual([right.documentId]);
      expect(ids((await get(R, right.documentId, { status: 'published' })).lefts)).toEqual([
        left.documentId,
      ]);
    });

    test('publishing Left before Right links the published sides once Right is published', async () => {
      const { left, right } = await setup();

      await publish(L, left.documentId);
      await publish(R, right.documentId);

      // Left must be republished for its published version to pick up the newly published Right
      await publish(L, left.documentId);

      const leftPublished = await get(L, left.documentId, { status: 'published' });
      expect(leftPublished.oneWay?.documentId).toBe(right.documentId);
      expect(ids(leftPublished.twoWay)).toEqual([right.documentId]);
      expect(ids((await get(R, right.documentId, { status: 'published' })).lefts)).toEqual([
        left.documentId,
      ]);
    });

    test('disconnecting in the draft only affects the published versions after republishing', async () => {
      const { left, right } = await setup();
      await publish(R, right.documentId);
      await publish(L, left.documentId);

      await update(L, left.documentId, {
        oneWay: { disconnect: [right.documentId] },
        twoWay: { disconnect: [right.documentId] },
      });

      const leftDraft = await get(L, left.documentId);
      expect(leftDraft.oneWay).toBeNull();
      expect(leftDraft.twoWay).toEqual([]);
      expect((await get(R, right.documentId)).lefts).toEqual([]);

      // published versions are untouched until Left is republished
      expect(ids((await get(R, right.documentId, { status: 'published' })).lefts)).toEqual([
        left.documentId,
      ]);

      await publish(L, left.documentId);

      const leftPublished = await get(L, left.documentId, { status: 'published' });
      expect(leftPublished.oneWay).toBeNull();
      expect(leftPublished.twoWay).toEqual([]);
      expect((await get(R, right.documentId, { status: 'published' })).lefts).toEqual([]);
    });
  });

  describe('i18n -> i18n', () => {
    const { left: L, right: R } = PAIRS.loc;

    const setup = async () => {
      const right = await create(R, { name: 'R-en' }, 'en');
      await update(R, right.documentId, { name: 'R-fr' }, 'fr');

      const left = await create(
        L,
        {
          name: 'L-en',
          oneWay: { connect: [right.documentId] },
          twoWay: { connect: [right.documentId] },
        },
        'en'
      );
      await update(
        L,
        left.documentId,
        {
          name: 'L-fr',
          oneWay: { connect: [right.documentId] },
          twoWay: { connect: [right.documentId] },
        },
        'fr'
      );
      return { left, right };
    };

    test('each Left locale links to the Right entry of the same locale', async () => {
      const { left, right } = await setup();

      for (const locale of ['en', 'fr']) {
        const leftDraft = await get(L, left.documentId, { locale });
        expect(ref(leftDraft.oneWay)).toEqual({ documentId: right.documentId, locale });
        expect(refs(leftDraft.twoWay)).toEqual([{ documentId: right.documentId, locale }]);

        const rightDraft = await get(R, right.documentId, { locale });
        expect(refs(rightDraft.lefts)).toEqual([{ documentId: left.documentId, locale }]);
      }
    });

    test('connecting a Right entry of another locale links the Right of the Left locale instead', async () => {
      const right = await create(R, { name: 'R-en' }, 'en');
      await update(R, right.documentId, { name: 'R-fr' }, 'fr');

      const left = await create(
        L,
        {
          name: 'L-en',
          oneWay: { connect: [{ documentId: right.documentId, locale: 'fr' }] },
          twoWay: { connect: [{ documentId: right.documentId, locale: 'fr' }] },
        },
        'en'
      );

      // the requested `fr` locale is ignored: a localized relation stays within its own locale
      const leftDraft = await get(L, left.documentId, { locale: 'en' });
      expect(ref(leftDraft.oneWay)).toEqual({ documentId: right.documentId, locale: 'en' });
      expect(refs(leftDraft.twoWay)).toEqual([{ documentId: right.documentId, locale: 'en' }]);

      expect((await get(R, right.documentId, { locale: 'fr' })).lefts).toEqual([]);
      expect(refs((await get(R, right.documentId, { locale: 'en' })).lefts)).toEqual([
        { documentId: left.documentId, locale: 'en' },
      ]);
    });

    test('publishing one Left locale only exposes the relation for that locale', async () => {
      const { left, right } = await setup();
      await publish(R, right.documentId, '*');

      await publish(L, left.documentId, 'fr');

      const leftFr = await get(L, left.documentId, { status: 'published', locale: 'fr' });
      expect(ref(leftFr.oneWay)).toEqual({ documentId: right.documentId, locale: 'fr' });
      expect(refs(leftFr.twoWay)).toEqual([{ documentId: right.documentId, locale: 'fr' }]);
      expect(
        refs((await get(R, right.documentId, { status: 'published', locale: 'fr' })).lefts)
      ).toEqual([{ documentId: left.documentId, locale: 'fr' }]);

      expect(await get(L, left.documentId, { status: 'published', locale: 'en' })).toBeNull();
      expect((await get(R, right.documentId, { status: 'published', locale: 'en' })).lefts).toEqual(
        []
      );
    });

    test('disconnecting one locale leaves the other locale linked', async () => {
      const { left, right } = await setup();
      await publish(R, right.documentId, '*');
      await publish(L, left.documentId, '*');

      await update(
        L,
        left.documentId,
        {
          oneWay: { disconnect: [right.documentId] },
          twoWay: { disconnect: [right.documentId] },
        },
        'fr'
      );
      await publish(L, left.documentId, 'fr');

      for (const status of ['draft', 'published'] as const) {
        const leftFr = await get(L, left.documentId, { status, locale: 'fr' });
        expect(leftFr.oneWay).toBeNull();
        expect(leftFr.twoWay).toEqual([]);
        expect((await get(R, right.documentId, { status, locale: 'fr' })).lefts).toEqual([]);

        const leftEn = await get(L, left.documentId, { status, locale: 'en' });
        expect(ref(leftEn.oneWay)).toEqual({ documentId: right.documentId, locale: 'en' });
        expect(refs((await get(R, right.documentId, { status, locale: 'en' })).lefts)).toEqual([
          { documentId: left.documentId, locale: 'en' },
        ]);
      }
    });
  });

  describe('D&P & i18n -> plain (no D&P, no i18n)', () => {
    const { left: L, right: R } = PAIRS.locToPlain;

    const setup = async () => {
      const right = await create(R, { name: 'R' });
      const link = {
        oneWay: { connect: [right.documentId] },
        twoWay: { connect: [right.documentId] },
      };
      const left = await create(L, { name: 'L-en', ...link }, 'en');
      await update(L, left.documentId, { name: 'L-fr', ...link }, 'fr');
      return { left, right };
    };

    test('every Left locale can link to the same plain Right entry', async () => {
      const { left, right } = await setup();

      for (const locale of ['en', 'fr']) {
        const leftDraft = await get(L, left.documentId, { locale });
        expect(leftDraft.oneWay?.documentId).toBe(right.documentId);
        expect(ids(leftDraft.twoWay)).toEqual([right.documentId]);
      }

      // the plain Right lists the draft Lefts for status=draft, and none for status=published yet
      expect(refs((await get(R, right.documentId, { status: 'draft' })).lefts)).toEqual([
        { documentId: left.documentId, locale: 'en' },
        { documentId: left.documentId, locale: 'fr' },
      ]);
      expect((await get(R, right.documentId, { status: 'published' })).lefts).toEqual([]);
    });

    test('publishing one Left locale keeps the link and exposes it on the plain Right', async () => {
      const { left, right } = await setup();

      await publish(L, left.documentId, 'en');

      const leftEn = await get(L, left.documentId, { status: 'published', locale: 'en' });
      expect(leftEn.oneWay?.documentId).toBe(right.documentId);
      expect(ids(leftEn.twoWay)).toEqual([right.documentId]);
      expect(await get(L, left.documentId, { status: 'published', locale: 'fr' })).toBeNull();

      expect(refs((await get(R, right.documentId, { status: 'published' })).lefts)).toEqual([
        { documentId: left.documentId, locale: 'en' },
      ]);
    });

    test('disconnecting one locale leaves the other locale linked', async () => {
      const { left, right } = await setup();
      await publish(L, left.documentId, '*');

      await update(
        L,
        left.documentId,
        {
          oneWay: { disconnect: [right.documentId] },
          twoWay: { disconnect: [right.documentId] },
        },
        'en'
      );
      await publish(L, left.documentId, 'en');

      for (const status of ['draft', 'published'] as const) {
        const leftEn = await get(L, left.documentId, { status, locale: 'en' });
        expect(leftEn.oneWay).toBeNull();
        expect(leftEn.twoWay).toEqual([]);

        const leftFr = await get(L, left.documentId, { status, locale: 'fr' });
        expect(leftFr.oneWay?.documentId).toBe(right.documentId);
        expect(ids(leftFr.twoWay)).toEqual([right.documentId]);

        expect(refs((await get(R, right.documentId, { status })).lefts)).toEqual([
          { documentId: left.documentId, locale: 'fr' },
        ]);
      }
    });

    test('unpublishing a Left locale keeps the draft link', async () => {
      const { left, right } = await setup();
      await publish(L, left.documentId, '*');

      await unpublish(L, left.documentId, 'en');

      expect(await get(L, left.documentId, { status: 'published', locale: 'en' })).toBeNull();
      expect((await get(L, left.documentId, { locale: 'en' })).oneWay?.documentId).toBe(
        right.documentId
      );
      expect(refs((await get(R, right.documentId, { status: 'published' })).lefts)).toEqual([
        { documentId: left.documentId, locale: 'fr' },
      ]);
      expect(refs((await get(R, right.documentId, { status: 'draft' })).lefts)).toEqual([
        { documentId: left.documentId, locale: 'en' },
        { documentId: left.documentId, locale: 'fr' },
      ]);
    });

    test('deleting the plain Right removes the link from every Left locale and status', async () => {
      const { left, right } = await setup();
      await publish(L, left.documentId, '*');

      await remove(R, right.documentId);

      for (const status of ['draft', 'published'] as const) {
        for (const locale of ['en', 'fr']) {
          const entry = await get(L, left.documentId, { status, locale });
          expect(entry.oneWay).toBeNull();
          expect(entry.twoWay).toEqual([]);
        }
      }
    });
  });

  describe('D&P -> plain (no D&P)', () => {
    const { left: L, right: R } = PAIRS.dpToPlain;

    const setup = async () => {
      const right = await create(R, { name: 'R' });
      const left = await create(L, {
        name: 'L',
        oneWay: { connect: [right.documentId] },
        twoWay: { connect: [right.documentId] },
      });
      return { left, right };
    };

    test('linking a draft Left is saved and publishing exposes it on the published side', async () => {
      const { left, right } = await setup();

      const leftDraft = await get(L, left.documentId);
      expect(leftDraft.oneWay?.documentId).toBe(right.documentId);
      expect(ids(leftDraft.twoWay)).toEqual([right.documentId]);
      expect(ids((await get(R, right.documentId, { status: 'draft' })).lefts)).toEqual([
        left.documentId,
      ]);
      expect((await get(R, right.documentId, { status: 'published' })).lefts).toEqual([]);

      await publish(L, left.documentId);

      const leftPublished = await get(L, left.documentId, { status: 'published' });
      expect(leftPublished.oneWay?.documentId).toBe(right.documentId);
      expect(ids(leftPublished.twoWay)).toEqual([right.documentId]);
      expect(ids((await get(R, right.documentId, { status: 'published' })).lefts)).toEqual([
        left.documentId,
      ]);
    });

    test('disconnecting and republishing Left removes it from the plain Right', async () => {
      const { left, right } = await setup();
      await publish(L, left.documentId);

      await update(L, left.documentId, {
        oneWay: { disconnect: [right.documentId] },
        twoWay: { disconnect: [right.documentId] },
      });

      // still linked through the published Left until it is republished
      expect((await get(R, right.documentId, { status: 'draft' })).lefts).toEqual([]);
      expect(ids((await get(R, right.documentId, { status: 'published' })).lefts)).toEqual([
        left.documentId,
      ]);

      await publish(L, left.documentId);

      for (const status of ['draft', 'published'] as const) {
        const entry = await get(L, left.documentId, { status });
        expect(entry.oneWay).toBeNull();
        expect(entry.twoWay).toEqual([]);
        expect((await get(R, right.documentId, { status })).lefts).toEqual([]);
      }
    });
  });
});
