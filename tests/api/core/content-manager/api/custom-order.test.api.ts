import { createTestBuilder } from 'api-tests/builder';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest, createContentAPIRequest } from 'api-tests/request';
import { createUtils } from 'api-tests/utils';

/**
 * Custom order of the entries of a collection type: turned on in the list view settings,
 * edited by moving entries in the Content Manager, and returned by the Content API when
 * no sort is requested.
 */
const UID = 'api::ordered-article.ordered-article';

const articleModel = {
  attributes: {
    title: {
      type: 'string',
      pluginOptions: {
        i18n: {
          localized: true,
        },
      },
    },
  },
  pluginOptions: {
    i18n: {
      localized: true,
    },
  },
  draftAndPublish: true,
  displayName: 'Ordered article',
  singularName: 'ordered-article',
  pluralName: 'ordered-articles',
  description: '',
  collectionName: '',
};

describe('CM API - Custom order', () => {
  const builder = createTestBuilder();
  let strapi: any;
  let utils: any;
  let rq: any;
  let rqContentAPI: any;
  let rqReadOnly: any;

  const roles: Array<{ id: number }> = [];
  const users: Array<{ id: number }> = [];

  // title -> documentId
  const ids: Record<string, string> = {};

  const create = async (title: string) => {
    const doc = await strapi.documents(UID).create({ data: { title }, locale: 'en' });
    ids[title] = doc.documentId;
  };

  /**
   * Titles as returned by the Content API, drafts by default so the order of every
   * document can be checked.
   */
  const apiTitles = async (qs: Record<string, unknown> = {}) => {
    const res = await rqContentAPI({
      method: 'GET',
      url: '/ordered-articles',
      qs: { status: 'draft', locale: 'en', ...qs },
    });

    expect(res.statusCode).toBe(200);

    return res.body.data.map((entry: { title: string }) => entry.title);
  };

  const setCustomOrder = async (customOrder: boolean) => {
    const { body } = await rq({
      method: 'GET',
      url: `/content-manager/content-types/${UID}/configuration`,
    });

    return rq({
      method: 'PUT',
      url: `/content-manager/content-types/${UID}/configuration`,
      body: { settings: { ...body.data.contentType.settings, customOrder } },
    });
  };

  const move = (
    title: string,
    body: Record<string, unknown>,
    { request = rq, locale = 'en' }: { request?: any; locale?: string } = {}
  ) =>
    request({
      method: 'POST',
      url: `/content-manager/collection-types/${UID}/${ids[title]}/actions/move`,
      qs: { locale },
      body,
    });

  beforeAll(async () => {
    await builder.addContentType(articleModel).build();

    strapi = await createStrapiInstance({
      register({ strapi }: { strapi: any }) {
        strapi.config.set('features.future.unstableCustomOrder', true);
      },
    });
    utils = createUtils(strapi);
    rq = await createAuthRequest({ strapi });
    rqContentAPI = createContentAPIRequest({ strapi });

    await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: { code: 'fr', name: 'French (fr)', isDefault: false },
    });

    const role = await utils.createRole({
      name: 'role-custom-order-reader',
      description: 'Can read the ordered articles but not update them',
    });
    await utils.assignPermissionsToRole(role.id, [
      {
        action: 'plugin::content-manager.explorer.read',
        subject: UID,
        properties: { fields: ['title'], locales: ['en', 'fr'] },
      },
    ]);
    const user = await utils.createUser({
      firstname: 'Reader',
      lastname: 'User',
      email: 'custom-order-reader.user@strapi.io',
      roles: [role.id],
    });
    roles.push(role);
    users.push(user);
    rqReadOnly = await createAuthRequest({ strapi, userInfo: user });

    for (const title of ['A', 'B', 'C', 'D']) {
      await create(title);
    }
  });

  afterAll(async () => {
    await utils.deleteUsersById(users.map((user) => user.id));
    await utils.deleteRolesById(roles.map((role) => role.id));
    await strapi.destroy();
    await builder.cleanup();
  });

  test('entries cannot be moved while custom order is off', async () => {
    expect(await apiTitles()).toEqual(['A', 'B', 'C', 'D']);

    const res = await move('D', { before: ids.A });

    expect(res.statusCode).toBe(400);
  });

  test('turning custom order on keeps the order the API was returning', async () => {
    const res = await setCustomOrder(true);

    expect(res.statusCode).toBe(200);
    expect(res.body.data.contentType.settings.customOrder).toBe(true);
    expect(await apiTitles()).toEqual(['A', 'B', 'C', 'D']);
  });

  test('an entry can be moved before another one', async () => {
    const res = await move('D', { before: ids.B });

    expect(res.statusCode).toBe(200);
    expect(res.body.data.documentId).toBe(ids.D);
    expect(await apiTitles()).toEqual(['A', 'D', 'B', 'C']);
  });

  test('an entry can be moved after another one', async () => {
    const res = await move('A', { after: ids.C });

    expect(res.statusCode).toBe(200);
    expect(await apiTitles()).toEqual(['D', 'B', 'C', 'A']);
  });

  test('moving an entry where it already is changes nothing', async () => {
    expect((await move('B', { after: ids.D })).statusCode).toBe(200);
    expect((await move('B', { before: ids.C })).statusCode).toBe(200);
    expect(await apiTitles()).toEqual(['D', 'B', 'C', 'A']);
  });

  test('the Content Manager list follows the custom order', async () => {
    const res = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${UID}`,
      qs: { locale: 'en', sort: 'strapi_position:ASC', page: 1, pageSize: 10 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.results.map((entry: { title: string }) => entry.title)).toEqual([
      'D',
      'B',
      'C',
      'A',
    ]);
  });

  test('an explicit sort wins over the custom order', async () => {
    expect(await apiTitles({ sort: 'title:asc' })).toEqual(['A', 'B', 'C', 'D']);
    expect(await apiTitles({ sort: 'title:desc' })).toEqual(['D', 'C', 'B', 'A']);
  });

  test('the custom order is paginated consistently', async () => {
    expect(await apiTitles({ pagination: { page: 1, pageSize: 2 } })).toEqual(['D', 'B']);
    expect(await apiTitles({ pagination: { page: 2, pageSize: 2 } })).toEqual(['C', 'A']);
  });

  test('the position is not exposed by the Content API', async () => {
    const res = await rqContentAPI({
      method: 'GET',
      url: '/ordered-articles',
      qs: { status: 'draft', locale: 'en' },
    });

    expect(res.body.data[0]).not.toHaveProperty('strapi_position');

    const sorted = await rqContentAPI({
      method: 'GET',
      url: '/ordered-articles',
      qs: { status: 'draft', locale: 'en', sort: 'strapi_position:desc' },
    });

    expect(sorted.statusCode).toBe(400);
  });

  test('a new entry goes on top', async () => {
    const res = await rq({
      method: 'POST',
      url: `/content-manager/collection-types/${UID}`,
      qs: { locale: 'en' },
      body: { title: 'E' },
    });

    expect(res.statusCode).toBe(201);
    ids.E = res.body.data.documentId;

    expect(await apiTitles()).toEqual(['E', 'D', 'B', 'C', 'A']);
  });

  test('the position cannot be set through the content of an entry', async () => {
    await strapi.documents(UID).update({
      documentId: ids.A,
      locale: 'en',
      data: { title: 'A', strapi_position: -1000 },
    });

    expect(await apiTitles()).toEqual(['E', 'D', 'B', 'C', 'A']);
  });

  test('a duplicated entry goes on top', async () => {
    const clone = await strapi.documents(UID).clone({
      documentId: ids.B,
      locale: 'en',
      data: { title: 'B copy' },
    });
    ids['B copy'] = clone.documentId;

    expect(await apiTitles()).toEqual(['B copy', 'E', 'D', 'B', 'C', 'A']);
  });

  test('published entries follow the same order, without being republished', async () => {
    for (const title of ['A', 'B', 'C', 'D', 'E']) {
      await strapi.documents(UID).publish({ documentId: ids[title], locale: 'en' });
    }

    expect(await apiTitles({ status: 'published' })).toEqual(['E', 'D', 'B', 'C', 'A']);

    expect((await move('A', { before: ids.E })).statusCode).toBe(200);

    expect(await apiTitles({ status: 'published' })).toEqual(['A', 'E', 'D', 'B', 'C']);
    expect(await apiTitles()).toEqual(['B copy', 'A', 'E', 'D', 'B', 'C']);
  });

  test('moving entries does not flag them as modified', async () => {
    const res = await rq({
      method: 'GET',
      url: `/content-manager/collection-types/${UID}`,
      qs: { locale: 'en', sort: 'strapi_position:ASC', page: 1, pageSize: 10 },
    });

    const statuses = Object.fromEntries(
      res.body.results.map((entry: { title: string; status: string }) => [
        entry.title,
        entry.status,
      ])
    );

    expect(statuses).toEqual({
      'B copy': 'draft',
      A: 'published',
      E: 'published',
      D: 'published',
      B: 'published',
      C: 'published',
    });
  });

  test('every locale of a document shares its position', async () => {
    // Created in the reverse order on purpose: the order must come from the documents
    await strapi.documents(UID).update({
      documentId: ids.C,
      locale: 'fr',
      data: { title: 'C fr' },
    });
    await strapi.documents(UID).update({
      documentId: ids.D,
      locale: 'fr',
      data: { title: 'D fr' },
    });

    expect(await apiTitles({ locale: 'fr' })).toEqual(['D fr', 'C fr']);

    // Moving from the list of a locale moves the document for every locale
    const res = await move('C', { before: ids.D }, { locale: 'fr' });

    expect(res.statusCode).toBe(200);
    expect(await apiTitles({ locale: 'fr' })).toEqual(['C fr', 'D fr']);
    expect(await apiTitles()).toEqual(['B copy', 'A', 'E', 'C', 'D', 'B']);
  });

  test('invalid moves are rejected', async () => {
    // Next to itself
    expect((await move('A', { before: ids.A })).statusCode).toBe(400);
    // Both sides at once
    expect((await move('A', { before: ids.B, after: ids.C })).statusCode).toBe(400);
    // No side
    expect((await move('A', {})).statusCode).toBe(400);
    // Unknown anchor
    expect((await move('A', { before: 'unknown-document-id' })).statusCode).toBe(404);

    expect(await apiTitles()).toEqual(['B copy', 'A', 'E', 'C', 'D', 'B']);
  });

  test('moving an entry requires the permission to update it', async () => {
    const res = await move('A', { after: ids.B }, { request: rqReadOnly });

    expect(res.statusCode).toBe(403);
    expect(await apiTitles()).toEqual(['B copy', 'A', 'E', 'C', 'D', 'B']);
  });

  test('a user who cannot update entries still sees them in the custom order', async () => {
    const res = await rqReadOnly({
      method: 'GET',
      url: `/content-manager/collection-types/${UID}`,
      qs: { locale: 'en', sort: 'strapi_position:ASC', page: 1, pageSize: 10 },
    });

    expect(res.statusCode).toBe(200);
    expect(res.body.results.map((entry: { title: string }) => entry.title)).toEqual([
      'B copy',
      'A',
      'E',
      'C',
      'D',
      'B',
    ]);
  });

  test('turning custom order off gives the previous API order back', async () => {
    const res = await setCustomOrder(false);

    expect(res.statusCode).toBe(200);
    expect(await apiTitles()).toEqual(['A', 'B', 'C', 'D', 'E', 'B copy']);
  });

  test('entries created while custom order was off land on top when it is back on', async () => {
    await create('F');
    await create('G');

    const res = await setCustomOrder(true);

    expect(res.statusCode).toBe(200);
    expect(await apiTitles()).toEqual(['G', 'F', 'B copy', 'A', 'E', 'C', 'D', 'B']);
  });
});
