import { createStrapiInstance } from 'api-tests/strapi';
import { createRequest, createAuthRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition } from 'api-tests/utils';

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

describeOnCondition(edition === 'EE')('History of Content API writes', () => {
  const builder = createTestBuilder();
  let strapi;
  let tokenRequest;
  let token;

  const createTokenRequest = async () => {
    const { accessKey, id } = await strapi.service('admin::api-token').create({
      kind: 'content-api',
      name: 'Mobile app',
      type: 'full-access',
      lifespan: null,
    });

    token = await strapi.db.query('admin::api-token').findOne({ where: { id } });

    return createRequest({ strapi }).setToken(accessKey);
  };

  const restCreate = (title: string, qs = {}) =>
    tokenRequest({ method: 'POST', url: '/api/notes', qs, body: { data: { title } } });

  const restUpdate = (documentId: string, title: string) =>
    tokenRequest({ method: 'PUT', url: `/api/notes/${documentId}`, body: { data: { title } } });

  const graphqlUpdate = (documentId: string, title: string) =>
    tokenRequest({
      method: 'POST',
      url: '/graphql',
      body: {
        query: `mutation ($documentId: ID!, $data: NoteInput!) {
          updateNote(documentId: $documentId, data: $data) { documentId }
        }`,
        variables: { documentId, data: { title } },
      },
    });

  const findVersions = () =>
    strapi.db.query(HISTORY_VERSION_UID).findMany({ where: { contentType: noteUid } });

  const expectContentApiTokenVersion = (version) => {
    expect(version).toMatchObject({
      source: 'content-api',
      authorType: 'token',
      authorModel: 'admin::api-token',
      authorId: token.documentId,
    });
  };

  beforeAll(async () => {
    await builder.addContentType(noteModel).build();
    strapi = await createStrapiInstance({ bypassAuth: false });
    tokenRequest = await createTokenRequest();
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(async () => {
    await strapi.db.query(HISTORY_VERSION_UID).deleteMany({ where: {} });
  });

  test('Records a REST create and update made with an API token', async () => {
    const created = await restCreate('Hello');
    await restUpdate(created.body.data.documentId, 'Hello again');

    const versions = await findVersions();
    expect(versions).toHaveLength(2);
    versions.forEach(expectContentApiTokenVersion);
  });

  test('Records a GraphQL update made with an API token', async () => {
    const created = await restCreate('Hello');
    await strapi.db.query(HISTORY_VERSION_UID).deleteMany({ where: {} });

    await graphqlUpdate(created.body.data.documentId, 'Hello again');

    const versions = await findVersions();
    expect(versions).toHaveLength(1);
    expectContentApiTokenVersion(versions[0]);
  });

  test('Records one published version when a document is created as published', async () => {
    await restCreate('Hello', { status: 'published' });

    const versions = await findVersions();
    expect(versions).toHaveLength(1);
    expect(versions[0].status).toBe('published');
  });

  test('Records a write with no authentication with no author', async () => {
    const role = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'public' } });
    const roleService = strapi.service('plugin::users-permissions.role');
    const { permissions } = await roleService.findOne(role.id);
    permissions['api::note'] = {
      controllers: { note: { create: { enabled: true, policy: '' } } },
    };
    await roleService.updateRole(role.id, { permissions });

    await createRequest({ strapi })({
      method: 'POST',
      url: '/api/notes',
      body: { data: { title: 'Hello' } },
    });

    const versions = await findVersions();
    expect(versions).toHaveLength(1);
    expect(versions[0]).toMatchObject({
      source: 'content-api',
      authorType: null,
      authorModel: null,
      authorId: null,
    });
  });

  describe('Writes made by an end user', () => {
    let endUser;
    let userRequest;

    const allowAuthenticatedWrites = async () => {
      const role = await strapi.db
        .query('plugin::users-permissions.role')
        .findOne({ where: { type: 'authenticated' } });
      const roleService = strapi.service('plugin::users-permissions.role');
      const { permissions } = await roleService.findOne(role.id);
      permissions['api::note'] = {
        controllers: { note: { create: { enabled: true, policy: '' } } },
      };
      await roleService.updateRole(role.id, { permissions });

      return role;
    };

    const findNoteVersions = async (documentId: string) => {
      const adminRequest = await createAuthRequest({ strapi });
      const { body } = await adminRequest({
        method: 'GET',
        url: `/content-manager/history-versions/?contentType=${noteUid}&documentId=${documentId}`,
      });

      return body.data;
    };

    beforeAll(async () => {
      const role = await allowAuthenticatedWrites();
      endUser = await strapi.service('plugin::users-permissions.user').add({
        role: role.id,
        username: 'history-end-user',
        email: 'history-end-user@strapi.io',
        password: 'Test1234!',
        provider: 'local',
        confirmed: true,
      });
      const jwt = await strapi.service('plugin::users-permissions.jwt').issue({ id: endUser.id });
      userRequest = createRequest({ strapi }).setToken(jwt);
    });

    test('Records a write with the end user as its author', async () => {
      const created = await userRequest({
        method: 'POST',
        url: '/api/notes',
        body: { data: { title: 'Hello' } },
      });

      const versions = await findNoteVersions(created.body.data.documentId);
      expect(versions).toHaveLength(1);
      expect(versions[0]).toMatchObject({
        source: 'content-api',
        author: {
          type: 'person',
          model: 'plugin::users-permissions.user',
          id: endUser.documentId,
          name: 'history-end-user',
        },
      });
    });

    test('Shows a deleted author when the end user is deleted', async () => {
      const created = await userRequest({
        method: 'POST',
        url: '/api/notes',
        body: { data: { title: 'Hello' } },
      });

      await strapi.db.query('plugin::users-permissions.user').delete({ where: { id: endUser.id } });

      const versions = await findNoteVersions(created.body.data.documentId);
      expect(versions[0].author).toEqual({
        type: 'person',
        model: 'plugin::users-permissions.user',
        id: null,
        name: null,
      });
    });
  });
});
