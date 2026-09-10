'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAuthRequest } = require('api-tests/request');

const SPACE_HEADER = 'X-Strapi-Space-Id';
const inSpace = (slug) => ({ [SPACE_HEADER]: slug });

/**
 * Settings resources shared with other workspaces — platform-wide (no binding)
 * or bound to several workspaces — are read-only from a sub-workspace and
 * managed from the default workspace. Exclusive resources stay editable.
 */
describe('Spaces — shared settings are read-only in a sub-workspace', () => {
  let strapi;
  let rq;

  const created = { roles: [], apiTokens: [], transferTokens: [], webhooks: [], locales: [] };

  const create = async (bucket, url, body, space = 'default') => {
    const res = await rq({ url, method: 'POST', body, headers: inSpace(space) });
    // The admin's create endpoints answer 201 with `{ data }`, i18n's answers 200 with the row.
    expect([200, 201]).toContain(res.statusCode);
    const data = res.body.data ?? res.body;
    created[bucket].push(data.id);
    return data;
  };

  let globexId;

  beforeAll(async () => {
    strapi = await createStrapiInstance();
    rq = await createAuthRequest({ strapi });

    // A third workspace, so that "bound to default and acme" is not "bound to every workspace".
    const all = await rq({ url: '/spaces/all', method: 'GET', headers: inSpace('default') });
    const existing = (all.body ?? []).find((space) => space.slug === 'globex');
    if (existing) {
      globexId = existing.id;
    } else {
      const globex = await rq({
        url: '/spaces',
        method: 'POST',
        body: { name: 'Globex', slug: 'globex' },
        headers: inSpace('default'),
      });
      expect([200, 201]).toContain(globex.statusCode);
      globexId = globex.body.id ?? globex.body.data?.id;
    }
  });

  afterAll(async () => {
    for (const id of created.roles) {
      await rq({ url: `/admin/roles/${id}`, method: 'DELETE' });
    }
    for (const id of created.apiTokens) {
      await rq({ url: `/admin/api-tokens/${id}`, method: 'DELETE' });
    }
    for (const id of created.transferTokens) {
      await rq({ url: `/admin/transfer/tokens/${id}`, method: 'DELETE' });
    }
    for (const id of created.webhooks) {
      await rq({ url: `/admin/webhooks/${id}`, method: 'DELETE' });
    }
    for (const id of created.locales) {
      await rq({ url: `/i18n/locales/${id}`, method: 'DELETE' });
    }
    if (globexId) {
      await rq({ url: `/spaces/${globexId}`, method: 'DELETE', headers: inSpace('default') });
    }
    await strapi.destroy();
  });

  describe('Roles', () => {
    let platformRole;
    let multiRole;
    let acmeRole;

    beforeAll(async () => {
      platformRole = await create('roles', '/admin/roles', { name: 'ro-platform', spaces: [] });
      multiRole = await create('roles', '/admin/roles', {
        name: 'ro-multi',
        spaces: ['default', 'acme'],
      });
      acmeRole = await create('roles', '/admin/roles', { name: 'ro-acme' }, 'acme');
    });

    test('a shared role is readable with its access, but not writable', async () => {
      const detail = await rq({
        url: `/admin/roles/${platformRole.id}`,
        method: 'GET',
        headers: inSpace('acme'),
      });
      expect(detail.statusCode).toBe(200);
      expect(detail.body.data.workspaceAccess).toEqual({
        readOnly: true,
        reason: 'platform-wide',
        boundSlugs: [],
      });

      const update = await rq({
        url: `/admin/roles/${platformRole.id}`,
        method: 'PUT',
        body: { name: 'hijacked' },
        headers: inSpace('acme'),
      });
      const permissions = await rq({
        url: `/admin/roles/${platformRole.id}/permissions`,
        method: 'PUT',
        body: { permissions: [] },
        headers: inSpace('acme'),
      });
      const remove = await rq({
        url: `/admin/roles/${platformRole.id}`,
        method: 'DELETE',
        headers: inSpace('acme'),
      });
      const multi = await rq({
        url: `/admin/roles/${multiRole.id}`,
        method: 'PUT',
        body: { name: 'hijacked' },
        headers: inSpace('acme'),
      });

      expect(update.statusCode).toBe(403);
      expect(update.body.error.details).toEqual({ reason: 'platform-wide' });
      expect(permissions.statusCode).toBe(403);
      expect(remove.statusCode).toBe(403);
      expect(multi.statusCode).toBe(403);
      expect(multi.body.error.details).toEqual({ reason: 'multi-bound' });
    });

    test('an exclusive role stays editable, and a sub-workspace cannot re-bind it', async () => {
      const update = await rq({
        url: `/admin/roles/${acmeRole.id}`,
        method: 'PUT',
        body: { name: 'ro-acme (edited)', spaces: [] },
        headers: inSpace('acme'),
      });
      expect(update.statusCode).toBe(200);

      const fromDefault = await rq({
        url: `/admin/roles/${acmeRole.id}`,
        method: 'GET',
        headers: inSpace('default'),
      });
      expect(fromDefault.body.data.name).toBe('ro-acme (edited)');
      expect(fromDefault.body.data.spaces).toEqual(['acme']);

      const batch = await rq({
        url: '/admin/roles/batch-delete',
        method: 'POST',
        body: { ids: [platformRole.id] },
        headers: inSpace('acme'),
      });
      expect(batch.statusCode).toBeLessThan(500);
      const stillThere = await rq({ url: `/admin/roles/${platformRole.id}`, method: 'GET' });
      expect(stillThere.statusCode).toBe(200);
    });
  });

  describe('API tokens', () => {
    let platformToken;
    let acmeToken;

    beforeAll(async () => {
      platformToken = await create('apiTokens', '/admin/api-tokens', {
        name: 'ro-platform-token',
        type: 'read-only',
        spaces: [],
      });
      acmeToken = await create(
        'apiTokens',
        '/admin/api-tokens',
        { name: 'ro-acme-token', type: 'read-only' },
        'acme'
      );
    });

    test('a shared token is read-only, regeneration included', async () => {
      const detail = await rq({
        url: `/admin/api-tokens/${platformToken.id}`,
        method: 'GET',
        headers: inSpace('acme'),
      });
      const update = await rq({
        url: `/admin/api-tokens/${platformToken.id}`,
        method: 'PUT',
        body: { name: 'hijacked', type: 'read-only' },
        headers: inSpace('acme'),
      });
      const regenerate = await rq({
        url: `/admin/api-tokens/${platformToken.id}/regenerate`,
        method: 'POST',
        headers: inSpace('acme'),
      });

      expect(detail.statusCode).toBe(200);
      expect(detail.body.data.workspaceAccess.readOnly).toBe(true);
      expect(update.statusCode).toBe(403);
      expect(regenerate.statusCode).toBe(403);
    });

    test('an exclusive token stays editable', async () => {
      const update = await rq({
        url: `/admin/api-tokens/${acmeToken.id}`,
        method: 'PUT',
        body: { name: 'ro-acme-token (edited)', type: 'read-only' },
        headers: inSpace('acme'),
      });
      const regenerate = await rq({
        url: `/admin/api-tokens/${acmeToken.id}/regenerate`,
        method: 'POST',
        headers: inSpace('acme'),
      });

      expect(update.statusCode).toBe(200);
      expect(regenerate.statusCode).toBe(201);
    });
  });

  describe('Transfer tokens', () => {
    test('shared read-only, exclusive editable', async () => {
      const platformToken = await create('transferTokens', '/admin/transfer/tokens', {
        name: 'ro-platform-transfer',
        permissions: ['push'],
        spaces: [],
      });
      const acmeToken = await create(
        'transferTokens',
        '/admin/transfer/tokens',
        { name: 'ro-acme-transfer', permissions: ['push'] },
        'acme'
      );

      const refused = await rq({
        url: `/admin/transfer/tokens/${platformToken.id}/regenerate`,
        method: 'POST',
        headers: inSpace('acme'),
      });
      const allowed = await rq({
        url: `/admin/transfer/tokens/${acmeToken.id}`,
        method: 'PUT',
        body: { name: 'ro-acme-transfer (edited)', permissions: ['push'] },
        headers: inSpace('acme'),
      });

      expect(refused.statusCode).toBe(403);
      expect(allowed.statusCode).toBe(200);
    });
  });

  describe('Webhooks', () => {
    test('shared read-only (trigger included), exclusive editable', async () => {
      const platformWebhook = await create('webhooks', '/admin/webhooks', {
        name: 'ro-platform-webhook',
        url: 'https://example.com/hook',
        headers: {},
        events: [],
      });
      const acmeWebhook = await create(
        'webhooks',
        '/admin/webhooks',
        { name: 'ro-acme-webhook', url: 'https://example.com/hook', headers: {}, events: [] },
        'acme'
      );

      const detail = await rq({
        url: `/admin/webhooks/${platformWebhook.id}`,
        method: 'GET',
        headers: inSpace('acme'),
      });
      const update = await rq({
        url: `/admin/webhooks/${platformWebhook.id}`,
        method: 'PUT',
        body: { name: 'hijacked', url: 'https://example.com/hook', headers: {}, events: [] },
        headers: inSpace('acme'),
      });
      const trigger = await rq({
        url: `/admin/webhooks/${platformWebhook.id}/trigger`,
        method: 'POST',
        headers: inSpace('acme'),
      });
      const allowed = await rq({
        url: `/admin/webhooks/${acmeWebhook.id}`,
        method: 'PUT',
        body: {
          name: 'ro-acme-webhook (edited)',
          url: 'https://example.com/hook',
          headers: {},
          events: [],
        },
        headers: inSpace('acme'),
      });

      expect(detail.statusCode).toBe(200);
      expect(detail.body.data.workspaceAccess.readOnly).toBe(true);
      expect(update.statusCode).toBe(403);
      expect(trigger.statusCode).toBe(403);
      expect(allowed.statusCode).toBe(200);
    });
  });

  describe('Locales', () => {
    let sharedLocale;
    let acmeLocale;

    // Idempotent: a locale left behind by an earlier run is reused and re-bound.
    const ensureLocale = async (code, name, spaces) => {
      const list = await rq({ url: '/i18n/locales?scope=all', method: 'GET' });
      const existing = (list.body ?? []).find((locale) => locale.code === code);
      if (existing) {
        const reset = await rq({
          url: `/i18n/locales/${existing.id}`,
          method: 'PUT',
          body: { name, isDefault: false, spaces },
          headers: inSpace('default'),
        });
        expect(reset.statusCode).toBe(200);
        created.locales.push(existing.id);
        return { ...existing, name };
      }
      return create('locales', '/i18n/locales', { code, name, isDefault: false, spaces });
    };

    beforeAll(async () => {
      sharedLocale = await ensureLocale('de', 'German', []);
      acmeLocale = await ensureLocale('fr', 'French', ['acme']);
    });

    test('a shared locale cannot be renamed or deleted, but can be set as default', async () => {
      const rename = await rq({
        url: `/i18n/locales/${sharedLocale.id}`,
        method: 'PUT',
        body: { name: 'Deutsch', isDefault: false },
        headers: inSpace('acme'),
      });
      const setDefault = await rq({
        url: `/i18n/locales/${sharedLocale.id}`,
        method: 'PUT',
        body: { name: 'German', isDefault: true },
        headers: inSpace('acme'),
      });
      const remove = await rq({
        url: `/i18n/locales/${sharedLocale.id}`,
        method: 'DELETE',
        headers: inSpace('acme'),
      });

      expect(rename.statusCode).toBe(403);
      expect(setDefault.statusCode).toBe(200);
      expect(remove.statusCode).toBe(403);
    });

    test('an exclusive locale stays editable, and ?scope=all stays scoped', async () => {
      const rename = await rq({
        url: `/i18n/locales/${acmeLocale.id}`,
        method: 'PUT',
        body: { name: 'Français', isDefault: false },
        headers: inSpace('acme'),
      });
      expect(rename.statusCode).toBe(200);

      const defaultOnly = await ensureLocale('it', 'Italian', ['default']);
      const list = await rq({
        url: '/i18n/locales?scope=all',
        method: 'GET',
        headers: inSpace('acme'),
      });
      expect(list.statusCode).toBe(200);
      expect(list.body.map((locale) => locale.code)).not.toContain(defaultOnly.code);
    });
  });
});
