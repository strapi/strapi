import { describeOnCondition, createUtils } from 'api-tests/utils';
import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

describeOnCondition(edition === 'EE')('Locales in audit logs (api)', () => {
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let utils: ReturnType<typeof createUtils>;
  let actingAdminId: number;
  let defaultLocale: { id: number; code: string };

  const actingAdmin = {
    email: 'locales-audit-actor@test.com',
    firstname: 'Locales',
    lastname: 'Actor',
    password: 'Password123',
  };

  const expectedActor = () => ({
    type: 'admin-user',
    user: { id: actingAdminId, email: actingAdmin.email, name: 'Locales Actor' },
  });

  const findLogs = async (action: string) =>
    strapi.db.query('admin::audit-log').findMany({
      where: { action },
      populate: ['user'],
      orderBy: { id: 'asc' },
    });

  // The audit row is written before the response returns, so a single read is enough:
  // nothing here runs in a transaction that would defer the write past the request.
  const expectExactlyOneLog = async (action: string) => {
    const logs = await findLogs(action);
    expect(logs).toHaveLength(1);
    return logs[0];
  };

  const expectNoLog = async (action: string) => {
    expect(await findLogs(action)).toHaveLength(0);
  };

  const clearAuditLogs = async () => {
    await strapi.db.query('admin::audit-log').deleteMany();
  };

  // isDefault is required by the create validation, so it is always sent.
  const createLocale = async (body: Record<string, unknown>) => {
    const res = await rq({
      url: '/i18n/locales',
      method: 'POST',
      body: { isDefault: false, ...body },
    });
    expect(res.statusCode).toBe(200);
    return res.body;
  };

  beforeAll(async () => {
    strapi = await createStrapiInstance();

    // The requests run as an admin of our own rather than the default super admin: with
    // only one admin in the database, asserting the recorded actor proves nothing, since
    // every implementation records the only user there is.
    utils = createUtils(strapi);
    const superAdminRole = await utils.getSuperAdminRole();
    const actor = await utils.createUser({ ...actingAdmin, roles: [superAdminRole.id] });
    actingAdminId = actor.id;

    rq = await createAuthRequest({ strapi, userInfo: actingAdmin });

    const row = await strapi.db.query('plugin::i18n.locale').findOne({ where: { code: 'en' } });
    defaultLocale = { id: row.id, code: row.code };
  });

  afterAll(async () => {
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
    await strapi
      .store({ type: 'plugin', name: 'i18n' })
      .set({ key: 'default_locale', value: 'en' });
    await clearAuditLogs();
    await utils.deleteUserById(actingAdminId);
    await strapi.destroy();
  });

  beforeEach(async () => {
    // Locales are global state shared by every test, so each one starts from the
    // single default locale rather than inheriting what the previous test left.
    await strapi
      .store({ type: 'plugin', name: 'i18n' })
      .set({ key: 'default_locale', value: 'en' });
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
    await clearAuditLogs();
  });

  describe('locale.create', () => {
    it('records the creation with the actor snapshot and the locale as resource', async () => {
      const locale = await createLocale({ code: 'fr', name: 'French (fr)' });

      const log = await expectExactlyOneLog('locale.create');
      expect(log.payload).toEqual({
        action: 'locale.create',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'locale', id: locale.id, name: 'French (fr)' },
        details: { isDefault: false },
      });
      expect(log.user.id).toBe(actingAdminId);
    });

    it('records a locale created as the default one', async () => {
      const locale = await createLocale({ code: 'es', name: 'Spanish (es)', isDefault: true });

      const log = await expectExactlyOneLog('locale.create');
      expect(log.payload.details).toEqual({ isDefault: true });
      expect(log.payload.resource).toEqual({ type: 'locale', id: locale.id, name: 'Spanish (es)' });

      // The controller creates the locale and switches the default separately, so one
      // request records both. locale.create states the intent; this row is the switch.
      const defaultLog = await expectExactlyOneLog('locale.default.update');
      expect(defaultLog.payload.details).toEqual({
        changes: {
          defaultLocale: { before: defaultLocale, after: { id: locale.id, code: 'es' } },
        },
      });
    });
  });

  describe('locale.update', () => {
    it('records a name change with its previous value', async () => {
      const locale = await createLocale({ code: 'fr', name: 'French (old)' });
      await clearAuditLogs();

      const res = await rq({
        url: `/i18n/locales/${locale.id}`,
        method: 'PUT',
        body: { name: 'French (France)' },
      });
      expect(res.statusCode).toBe(200);

      const log = await expectExactlyOneLog('locale.update');
      expect(log.payload).toEqual({
        action: 'locale.update',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'locale', id: locale.id, name: 'French (France)' },
        details: { changes: { name: { before: 'French (old)', after: 'French (France)' } } },
      });
      expect(log.user.id).toBe(actingAdminId);
    });

    it('records nothing when the name does not change', async () => {
      const locale = await createLocale({ code: 'fr', name: 'French (fr)' });
      await clearAuditLogs();

      const res = await rq({
        url: `/i18n/locales/${locale.id}`,
        method: 'PUT',
        body: { name: 'French (fr)' },
      });
      expect(res.statusCode).toBe(200);

      await expectNoLog('locale.update');
    });
  });

  describe('locale.delete', () => {
    it('records the deletion with the locale as resource and no details', async () => {
      const locale = await createLocale({ code: 'fr', name: 'French (fr)' });
      await clearAuditLogs();

      const res = await rq({ url: `/i18n/locales/${locale.id}`, method: 'DELETE' });
      expect(res.statusCode).toBe(200);

      const log = await expectExactlyOneLog('locale.delete');
      expect(log.payload).toEqual({
        action: 'locale.delete',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'locale', id: locale.id, name: 'French (fr)' },
      });
      expect(log.user.id).toBe(actingAdminId);
    });
  });

  describe('locale.default.update', () => {
    it('records the switch with both locales and the new default as resource', async () => {
      const locale = await createLocale({ code: 'fr', name: 'French (fr)' });
      await clearAuditLogs();

      const res = await rq({
        url: `/i18n/locales/${locale.id}`,
        method: 'PUT',
        body: { name: 'French (fr)', isDefault: true },
      });
      expect(res.statusCode).toBe(200);

      const log = await expectExactlyOneLog('locale.default.update');
      expect(log.payload).toEqual({
        action: 'locale.default.update',
        date: expect.any(String),
        actor: expectedActor(),
        origin: 'admin-panel',
        resource: { type: 'locale', id: locale.id, name: 'French (fr)' },
        details: {
          changes: {
            defaultLocale: { before: defaultLocale, after: { id: locale.id, code: 'fr' } },
          },
        },
      });
      expect(log.user.id).toBe(actingAdminId);
    });

    it('records nothing when the locale is already the default one', async () => {
      const res = await rq({
        url: `/i18n/locales/${defaultLocale.id}`,
        method: 'PUT',
        body: { name: 'English (en)', isDefault: true },
      });
      expect(res.statusCode).toBe(200);

      await expectNoLog('locale.default.update');
    });
  });
});
