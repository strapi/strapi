'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createAuthRequest } = require('api-tests/request');

const client = process.env.DATABASE_CLIENT ?? 'sqlite';
const describeMysql = client === 'mysql' || client === 'mysql2' ? describe : describe.skip;

const RACE_UID = 'api::publish-race.publish-race';

const builder = createTestBuilder();
const model = {
  attributes: {
    name: {
      type: 'string',
      pluginOptions: { i18n: { localized: true } },
    },
  },
  draftAndPublish: true,
  displayName: 'Publish race',
  singularName: 'publish-race',
  pluralName: 'publish-races',
  pluginOptions: { i18n: { localized: true } },
};

/**
 * Opens once every request has arrived, or once another request is waiting
 * for the document lock. With the fix, the second request blocks on that lock
 * before it can arrive, and waiting for it would hang the first one.
 */
const createBarrier = (parties) => {
  let arrived = 0;
  let pendingLocks = 0;
  let open = () => {};
  const opened = new Promise((resolve) => {
    open = resolve;
  });

  // A request waiting here holds no pending lock call, so a pending call
  // after an arrival belongs to another request.
  const check = () => {
    if (arrived >= parties || (arrived > 0 && pendingLocks > 0)) {
      open();
    }
  };

  return {
    async arrive() {
      arrived += 1;
      check();
      await opened;
    },
    lockStarted() {
      pendingLocks += 1;
      check();
    },
    lockFinished() {
      pendingLocks -= 1;
    },
  };
};

describeMysql('MySQL Content Manager save and publish of a new locale', () => {
  let strapi;
  let rq;
  let barrier;

  beforeAll(async () => {
    await builder.addContentType(model).build();
    strapi = await createStrapiInstance({
      bootstrap({ strapi: s }) {
        const lockDocumentId = s.db.lockDocumentId.bind(s.db);
        s.db.lockDocumentId = async (documentId) => {
          const current = barrier;
          current?.lockStarted();
          try {
            return await lockDocumentId(documentId);
          } finally {
            current?.lockFinished();
          }
        };

        // The publish route reads the document before it calls update. Hold
        // each update here, after those reads and before update's own lock.
        s.documents.use(async (context, next) => {
          if (barrier && context.uid === RACE_UID && context.action === 'update') {
            await barrier.arrive();
          }

          return next();
        });
      },
    });
    rq = await createAuthRequest({ strapi });
    await strapi.plugin('i18n').service('locales').create({ code: 'fr', name: 'French' });
  }, 120000);

  afterAll(async () => {
    if (strapi) {
      await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
      await strapi.destroy();
    }
    await builder.cleanup();
  });

  test('creates one french locale when two saves overlap', async () => {
    const created = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${RACE_UID}`,
      body: { name: 'en' },
    });
    const { documentId } = created.body.data;

    barrier = createBarrier(2);
    const publish = (name) =>
      rq({
        method: 'POST',
        url: `/content-manager/collection-types/${RACE_UID}/${documentId}/actions/publish`,
        body: { name, locale: 'fr' },
      });
    const responses = await Promise.all([publish('a'), publish('b')]);
    barrier = undefined;

    responses.forEach((response) => {
      expect(response.statusCode).toBe(200);
    });

    const drafts = await strapi.db.query(RACE_UID).findMany({
      where: { documentId, locale: 'fr', publishedAt: null },
      select: ['id'],
    });
    const published = await strapi.db.query(RACE_UID).findMany({
      where: { documentId, locale: 'fr', publishedAt: { $notNull: true } },
      select: ['id'],
    });

    expect(drafts).toHaveLength(1);
    expect(published).toHaveLength(1);
  });

  test('creates one french draft when two updates in caller transactions overlap', async () => {
    // The MCP update handlers open a transaction and then call update. The
    // i18n middleware reads inside that transaction before the repository runs.
    const created = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${RACE_UID}`,
      body: { name: 'en' },
    });
    const { documentId } = created.body.data;

    barrier = createBarrier(2);
    const update = (name) =>
      strapi.db.transaction(() =>
        strapi.documents(RACE_UID).update({ documentId, locale: 'fr', data: { name } })
      );
    await Promise.all([update('a'), update('b')]);
    barrier = undefined;

    const drafts = await strapi.db.query(RACE_UID).findMany({
      where: { documentId, locale: 'fr', publishedAt: null },
      select: ['id'],
    });

    expect(drafts).toHaveLength(1);
  });
});
