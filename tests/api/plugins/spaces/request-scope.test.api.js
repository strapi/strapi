'use strict';

const path = require('path');

const { createStrapiInstance } = require('api-tests/strapi');
const { createTestBuilder } = require('api-tests/builder');
const { createAuthRequest } = require('api-tests/request');

/**
 * Which space a request ends up in, over HTTP, with the real machinery.
 *
 * `isolation.test.api.js` covers the same ground with the plugin switched on,
 * and needs an Enterprise licence to run. This assembles the same pieces by
 * hand — the query scope, the document-service middleware, the access service
 * and the role scope, all the real ones — so the path a request actually takes
 * is covered on every run.
 *
 * That path is where the interesting failures live. A request is asked which
 * space it is in more than once, from more than one place, and the answers have
 * to agree with the caller rather than with whoever asked first.
 *
 * Only what a licence gates is left out: the plugin's own services are stubbed,
 * because Community does not register them.
 */
const PLUGIN = path.resolve(__dirname, '../../../../packages/plugins/spaces/dist/server');
/* eslint-disable import/no-dynamic-require */
const { createSpacesQueryScope } = require(`${PLUGIN}/scope/query-scope.js`);
const { registerDocumentServiceMiddleware } = require(`${PLUGIN}/document-service/index.js`);
const createAccessService = require(`${PLUGIN}/services/access.js`);
const createPermissionsService = require(`${PLUGIN}/services/permissions.js`).default;
/* eslint-enable import/no-dynamic-require */

const builder = createTestBuilder();

let strapi;

const article = {
  displayName: 'Scoped request article',
  singularName: 'scoped-request-article',
  pluralName: 'scoped-request-articles',
  attributes: { title: { type: 'string' } },
};

const UID = 'api::scoped-request-article.scoped-request-article';

describe('Spaces | which space a request acts in', () => {
  let france;
  let germany;

  beforeAll(async () => {
    await builder.addContentType(article).build();

    strapi = await createStrapiInstance();

    france = await strapi.db.query('plugin::spaces.space').create({
      data: { name: 'France', slug: 'fr-req', status: 'active', isDefault: true },
    });
    germany = await strapi.db.query('plugin::spaces.space').create({
      data: { name: 'Germany', slug: 'de-req', status: 'active', isDefault: false },
    });

    await strapi.db
      .query(UID)
      .create({ data: { title: 'Bonjour', documentId: 'sr1', space: france.id } });
    await strapi.db
      .query(UID)
      .create({ data: { title: 'Guten Tag', documentId: 'sr2', space: germany.id } });

    const spaces = [france, germany];
    const stubs = {
      'plugin::spaces.spaces': {
        list: async () => spaces,
        findById: async (id) => spaces.find((space) => space.id === id),
        findBySlug: async (slug) => spaces.find((space) => space.slug === slug),
        resolveHeaderValue: async (raw) => spaces.find((space) => space.slug === raw),
        getDefault: async () => france,
        isContentTypeAvailable: () => true,
      },
      'plugin::spaces.membership': {
        listForUser: async () => [],
        isMember: async () => false,
        getEffectiveRoleIds: async () => [],
      },
    };

    const realService = strapi.service.bind(strapi);
    let access;

    strapi.service = (uid) => {
      if (uid === 'plugin::spaces.access') {
        return access;
      }

      return stubs[uid] ?? realService(uid);
    };

    access = createAccessService({ strapi });

    strapi.db.queryScopes.register('spaces', createSpacesQueryScope(strapi));
    registerDocumentServiceMiddleware(strapi);
    createPermissionsService({ strapi }).installRoleScope();
    strapi.get('auth').onAuthenticated((ctx) => access.applyToRequest(ctx));
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  const listAs = async (space) => {
    let rq = await createAuthRequest({ strapi });

    if (space) {
      rq = rq.setHeaders({ 'X-Strapi-Space': space });
    }

    const { statusCode, body } = await rq({
      url: `/content-manager/collection-types/${UID}`,
      method: 'GET',
    });

    return {
      statusCode,
      total: body.pagination?.total,
      titles: (body.results ?? []).map((entry) => entry.title).sort(),
    };
  };

  test('a named space sees its own entries', async () => {
    await expect(listAs('fr-req')).resolves.toEqual({
      statusCode: 200,
      total: 1,
      titles: ['Bonjour'],
    });
  });

  test('the other named space sees its own', async () => {
    await expect(listAs('de-req')).resolves.toEqual({
      statusCode: 200,
      total: 1,
      titles: ['Guten Tag'],
    });
  });

  test('asking for every space sees every space', async () => {
    // The one that got away: the caller is asked about before their identity is
    // settled, and the cross-space view is not on offer to nobody in
    // particular. If that first answer sticks, this quietly becomes the default
    // space — a successful request, listing the wrong thing.
    await expect(listAs('*')).resolves.toEqual({
      statusCode: 200,
      total: 2,
      titles: ['Bonjour', 'Guten Tag'],
    });
  });

  test('asking for nothing lands in the default space', async () => {
    await expect(listAs(undefined)).resolves.toEqual({
      statusCode: 200,
      total: 1,
      titles: ['Bonjour'],
    });
  });

  test('the space is not on the entries that come back', async () => {
    const rq = (await createAuthRequest({ strapi })).setHeaders({ 'X-Strapi-Space': 'fr-req' });

    const { body } = await rq({
      url: `/content-manager/collection-types/${UID}`,
      method: 'GET',
    });

    expect(body.results.every((entry) => !('space' in entry))).toBe(true);
  });
});
