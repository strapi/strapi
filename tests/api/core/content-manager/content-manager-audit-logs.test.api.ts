import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition, createUtils } from 'api-tests/utils';
import type { Core } from '@strapi/types';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const articleUID = 'api::audit-article.audit-article';
const articleModel = {
  draftAndPublish: true,
  singularName: 'audit-article',
  pluralName: 'audit-articles',
  displayName: 'Audit article',
  kind: 'collectionType',
  pluginOptions: { i18n: { localized: true } },
  attributes: {
    title: { type: 'string', pluginOptions: { i18n: { localized: true } } },
  },
};

describeOnCondition(edition === 'EE')('Content Manager in audit logs (api)', () => {
  const builder = createTestBuilder();
  let strapi: Core.Strapi;
  let rq: Awaited<ReturnType<typeof createAuthRequest>>;
  let utils: ReturnType<typeof createUtils>;
  let actingAdminId: number;

  const actingAdmin = {
    email: 'content-audit-actor@test.com',
    firstname: 'Content',
    lastname: 'Actor',
    password: 'Password123',
  };

  const expectedActor = () => ({
    type: 'admin-user',
    user: { id: actingAdminId, email: actingAdmin.email, name: 'Content Actor' },
  });

  const findLogs = async (action: string) =>
    strapi.db.query('admin::audit-log').findMany({
      where: { action },
      populate: ['user'],
      orderBy: { id: 'asc' },
    });

  // Entry events are emitted without being awaited, so the row can land after the response.
  // The row and its user link are written in two steps, so wait for both.
  const waitForLogs = async (action: string, count: number) => {
    for (let attempt = 0; attempt < 40; attempt += 1) {
      const logs = await findLogs(action);
      if (logs.length >= count && logs.every((log) => log.user)) {
        return logs;
      }
      await new Promise((resolve) => {
        setTimeout(resolve, 50);
      });
    }
    return findLogs(action);
  };

  const clearAuditLogs = async () => {
    await strapi.db.query('admin::audit-log').deleteMany();
  };

  // Set up outside a request, so these writes produce no audit rows.
  const createPublishedArticle = async (title: string) => {
    const documents = strapi.documents(articleUID);
    const en = await documents.create({ data: { title }, locale: 'en' });
    await documents.update({
      documentId: en.documentId,
      data: { title: `${title} (fr)` },
      locale: 'fr',
    });
    await documents.publish({ documentId: en.documentId, locale: '*' });

    // A draft that differs from the published version, so there is something to discard.
    await documents.update({ documentId: en.documentId, data: { title: 'edited' }, locale: 'fr' });

    return en.documentId;
  };

  const draftDiscardRow = (documentId: string, locale: string) => ({
    action: 'entry.draft-discard',
    date: expect.any(String),
    actor: expectedActor(),
    origin: 'admin-panel',
    resource: { type: 'entry', uid: articleUID, id: documentId },
    details: { locale },
  });

  beforeAll(async () => {
    await builder.addContentType(articleModel).build();

    strapi = await createStrapiInstance();

    // Requests run as an admin of our own: with only the default super admin in the
    // database, asserting the actor would prove nothing.
    utils = createUtils(strapi);
    const superAdminRole = await utils.getSuperAdminRole();
    const actor = await utils.createUser({ ...actingAdmin, roles: [superAdminRole.id] });
    actingAdminId = actor.id;

    rq = await createAuthRequest({ strapi, userInfo: actingAdmin });

    const res = await rq({
      method: 'POST',
      url: '/i18n/locales',
      body: { code: 'fr', name: 'French (fr)', isDefault: false },
    });
    expect(res.statusCode).toBe(200);
  });

  afterAll(async () => {
    await clearAuditLogs();
    await strapi.db.query('plugin::i18n.locale').deleteMany({ where: { code: { $ne: 'en' } } });
    await utils.deleteUserById(actingAdminId);
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(clearAuditLogs);

  describe('entry.draft-discard', () => {
    test('records the discarded draft with its locale', async () => {
      const documentId = await createPublishedArticle('discard');

      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${articleUID}/${documentId}/actions/discard`,
        qs: { locale: 'fr' },
      });
      expect(res.statusCode).toBe(200);

      const logs = await waitForLogs('entry.draft-discard', 1);
      expect(logs).toHaveLength(1);
      expect(logs[0].user.id).toBe(actingAdminId);
      expect(logs[0].payload).toEqual(draftDiscardRow(documentId, 'fr'));
      expect(JSON.stringify(logs[0].payload)).not.toContain('edited');
    });

    test('records the discard next to the unpublish when unpublishing with discardDraft', async () => {
      const documentId = await createPublishedArticle('unpublish');

      const res = await rq({
        method: 'POST',
        url: `/content-manager/collection-types/${articleUID}/${documentId}/actions/unpublish`,
        qs: { locale: 'fr' },
        body: { discardDraft: true },
      });
      expect(res.statusCode).toBe(200);

      const logs = await waitForLogs('entry.draft-discard', 1);
      expect(logs.map((log) => log.payload)).toEqual([draftDiscardRow(documentId, 'fr')]);
      expect(await waitForLogs('entry.unpublish', 1)).toHaveLength(1);
    });
  });
});
