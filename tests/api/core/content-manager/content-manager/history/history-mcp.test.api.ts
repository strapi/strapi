import { createStrapiInstance } from 'api-tests/strapi';
import { createAuthRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition, createUtils } from 'api-tests/utils';
import { createMcpClient, expectToolOk } from '../../../mcp/utils/mcp-client';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const HISTORY_VERSION_UID = 'plugin::content-manager.history-version';

const noteUid = 'api::note.note';
const noteModel = {
  draftAndPublish: true,
  singularName: 'note',
  pluralName: 'notes',
  displayName: 'Note',
  kind: 'collectionType',
  attributes: {
    title: {
      type: 'string',
    },
  },
};

const CM_ACTIONS = {
  read: 'plugin::content-manager.explorer.read',
  create: 'plugin::content-manager.explorer.create',
  update: 'plugin::content-manager.explorer.update',
  publish: 'plugin::content-manager.explorer.publish',
} as const;

describeOnCondition(edition === 'EE')('History of MCP writes', () => {
  const builder = createTestBuilder();
  let strapi;
  let utils;
  let mcp;
  let accessKey: string;
  let tokenOwnerId: number;
  let tokenOwnerDocumentId: string;

  const tokenOwner = {
    email: 'history-mcp-owner@test.com',
    firstname: 'History',
    lastname: 'Owner',
    password: 'Password123',
  };

  const permission = (action: string, properties = {}) => ({
    action,
    subject: noteUid,
    conditions: [],
    properties,
  });

  const callTool = async (name: string, args = {}) => {
    const response = await mcp.callTool(accessKey, name, args);

    expectToolOk(response);

    return response;
  };

  const createNote = async (title: string) => {
    const response = await callTool('create_note', { data: { title } });
    const data = response.result?.structuredContent?.data as { documentId: string };

    return data.documentId;
  };

  const findVersions = async () => {
    await strapi.db.settleTransactionHooks();

    return strapi.db.query(HISTORY_VERSION_UID).findMany({ where: { contentType: noteUid } });
  };

  const deleteVersions = async () => {
    await strapi.db.settleTransactionHooks();
    await strapi.db.query(HISTORY_VERSION_UID).deleteMany({ where: {} });
  };

  const expectMcpVersion = (version, status: string) => {
    expect(version).toMatchObject({
      source: 'mcp',
      status,
      authorType: 'person',
      authorModel: 'admin::user',
      authorId: tokenOwnerDocumentId,
    });
  };

  beforeAll(async () => {
    await builder.addContentType(noteModel).build();
    strapi = await createStrapiInstance({
      register({ strapi: instance }) {
        instance.config.set('features.future.adminTokens', true);
        instance.config.set('server.mcp.enabled', true);
      },
    });
    strapi.config.set('admin.secrets.encryptionKey', 'test-encryption-key');

    utils = createUtils(strapi);
    const superAdminRole = await utils.getSuperAdminRole();
    const owner = await utils.createUser({ ...tokenOwner, roles: [superAdminRole.id] });
    tokenOwnerId = owner.id;
    tokenOwnerDocumentId = owner.documentId;

    const rq = await createAuthRequest({ strapi, userInfo: tokenOwner });
    const { body } = await rq({
      url: '/admin/admin-tokens',
      method: 'POST',
      body: {
        name: 'history-mcp-token',
        adminPermissions: [
          permission(CM_ACTIONS.read, { fields: ['title'] }),
          permission(CM_ACTIONS.create, { fields: ['title'] }),
          permission(CM_ACTIONS.update, { fields: ['title'] }),
          permission(CM_ACTIONS.publish),
        ],
      },
    });
    accessKey = body.data.accessKey;

    mcp = createMcpClient(strapi, 'strapi-mcp-history-test');
    await mcp.initializeSession(accessKey);
  });

  afterAll(async () => {
    await strapi.db.query('admin::api-token').deleteMany({ where: { kind: 'admin' } });
    await utils.deleteUserById(tokenOwnerId);
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(async () => {
    await deleteVersions();
  });

  test('Records a draft version for a create', async () => {
    await createNote('Hello');

    const versions = await findVersions();
    expect(versions).toHaveLength(1);
    expectMcpVersion(versions[0], 'draft');
  });

  test('Records a version for an update', async () => {
    const documentId = await createNote('Hello');
    await deleteVersions();

    await callTool('update_note', { documentId, data: { title: 'Hello again' } });

    const versions = await findVersions();
    expect(versions).toHaveLength(1);
    expectMcpVersion(versions[0], 'draft');
  });

  test('Records one published version for a publish, and no draft version', async () => {
    const documentId = await createNote('Hello');
    await deleteVersions();

    await callTool('publish_note', { documentId });

    const versions = await findVersions();
    expect(versions).toHaveLength(1);
    expectMcpVersion(versions[0], 'published');
  });

  test('Records one version for an unpublish', async () => {
    const documentId = await createNote('Hello');
    await callTool('publish_note', { documentId });
    await deleteVersions();

    await callTool('unpublish_note', { documentId });

    const versions = await findVersions();
    expect(versions).toHaveLength(1);
    expectMcpVersion(versions[0], 'draft');
  });

  test('Shows the token owner as the author in the versions list', async () => {
    const documentId = await createNote('Hello');
    await strapi.db.settleTransactionHooks();

    const adminRequest = await createAuthRequest({ strapi });
    const { body } = await adminRequest({
      method: 'GET',
      url: `/content-manager/history-versions/?contentType=${noteUid}&documentId=${documentId}`,
    });

    expect(body.data[0].author).toEqual({
      type: 'person',
      model: 'admin::user',
      id: tokenOwnerDocumentId,
      name: 'History Owner',
    });
  });
});
