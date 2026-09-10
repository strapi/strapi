'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const SPACE_HEADER = 'X-Strapi-Space-Id';
const inSpace = (slug) => ({ [SPACE_HEADER]: slug });

/**
 * The workspace cap is instance-level: the licence option wins, the plugin
 * config (`plugins.spaces.config.maxSpaces`) is the self-hosted fallback.
 */
describe('Spaces — workspace limits', () => {
  let strapi;
  let rq;
  const createdIds = [];

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });
  });

  afterAll(async () => {
    strapi.config.set('plugin::spaces.maxSpaces', null);
    for (const id of createdIds) {
      await rq({ url: `/spaces/${id}`, method: 'DELETE', headers: inSpace('default') });
    }
    await strapi.destroy();
  });

  test('the limits endpoint is visible from default only', async () => {
    const fromDefault = await rq({
      url: '/spaces/limits',
      method: 'GET',
      headers: inSpace('default'),
    });
    const fromAcme = await rq({ url: '/spaces/limits', method: 'GET', headers: inSpace('acme') });

    expect(fromDefault.statusCode).toBe(200);
    expect(fromDefault.body).toMatchObject({ maxSpaces: null, canCreate: true });
    expect(fromDefault.body.count).toBeGreaterThanOrEqual(2);
    expect(fromAcme.statusCode).toBe(404);
  });

  test('creation is refused at the cap with an explicit code', async () => {
    const before = await rq({ url: '/spaces/limits', method: 'GET', headers: inSpace('default') });
    strapi.config.set('plugin::spaces.maxSpaces', before.body.count);

    const limits = await rq({ url: '/spaces/limits', method: 'GET', headers: inSpace('default') });
    expect(limits.body).toMatchObject({ maxSpaces: before.body.count, canCreate: false });

    const refused = await rq({
      url: '/spaces',
      method: 'POST',
      body: { name: 'One too many', slug: 'one-too-many' },
      headers: inSpace('default'),
    });
    expect(refused.statusCode).toBe(403);
    expect(refused.body.error.details).toMatchObject({ code: 'SPACES_LIMIT_REACHED' });

    strapi.config.set('plugin::spaces.maxSpaces', before.body.count + 1);
    const allowed = await rq({
      url: '/spaces',
      method: 'POST',
      body: { name: 'Within the cap', slug: 'within-the-cap' },
      headers: inSpace('default'),
    });
    expect([200, 201]).toContain(allowed.statusCode);
    createdIds.push(allowed.body.id ?? allowed.body.data?.id);
  });
});
