import { createStrapiInstance } from 'api-tests/strapi';
import { createRequest } from 'api-tests/request';
import { createTestBuilder } from 'api-tests/builder';
import { describeOnCondition } from 'api-tests/utils';

const edition = process.env.STRAPI_DISABLE_EE === 'true' ? 'CE' : 'EE';

const HISTORY_VERSION_UID = 'plugin::content-manager.history-version';
const CONFIG_KEY = 'admin.history.contentApi';

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

describeOnCondition(edition === 'EE')('History of content API writes', () => {
  const builder = createTestBuilder();
  let strapi;
  let apiTokenRequest;
  let endUserRequest;
  let publicRequest;

  const grantNoteWrites = async (roleType: 'public' | 'authenticated') => {
    const roleService = strapi.service('plugin::users-permissions.role');
    const role = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: roleType } });
    const { permissions } = await roleService.findOne(role.id);

    permissions['api::note'] = {
      controllers: {
        note: {
          create: { enabled: true, policy: '' },
          update: { enabled: true, policy: '' },
        },
      },
    };

    await roleService.updateRole(role.id, { permissions });
  };

  const createApiTokenRequest = async () => {
    const { accessKey } = await strapi.service('admin::api-token').create({
      kind: 'content-api',
      name: 'Mobile app',
      type: 'full-access',
      lifespan: null,
    });

    return createRequest({ strapi }).setToken(accessKey);
  };

  const createEndUserRequest = async () => {
    const authenticatedRole = await strapi.db
      .query('plugin::users-permissions.role')
      .findOne({ where: { type: 'authenticated' } });
    const user = await strapi.service('plugin::users-permissions.user').add({
      username: 'jdoe',
      email: 'jdoe@example.com',
      password: 'Test1234!',
      confirmed: true,
      provider: 'local',
      role: authenticatedRole.id,
    });
    const jwt = strapi.service('plugin::users-permissions.jwt').issue({ id: user.id });

    return createRequest({ strapi }).setToken(jwt);
  };

  const restCreate = (request) => (title: string) =>
    request({ method: 'POST', url: '/api/notes', body: { data: { title } } });

  const restUpdate = (request) => (documentId: string, title: string) =>
    request({ method: 'PUT', url: `/api/notes/${documentId}`, body: { data: { title } } });

  const graphqlCreate = (request) => (title: string) =>
    request({
      method: 'POST',
      url: '/graphql',
      body: {
        query: `mutation ($data: NoteInput!) { createNote(data: $data) { documentId } }`,
        variables: { data: { title } },
      },
    });

  const graphqlUpdate = (request) => (documentId: string, title: string) =>
    request({
      method: 'POST',
      url: '/graphql',
      body: {
        query: `mutation ($documentId: ID!, $data: NoteInput!) {
          updateNote(documentId: $documentId, data: $data) { documentId }
        }`,
        variables: { documentId, data: { title } },
      },
    });

  const apis = {
    REST: { create: restCreate, update: restUpdate, documentIdOf: (body) => body.data.documentId },
    GraphQL: {
      create: graphqlCreate,
      update: graphqlUpdate,
      documentIdOf: (body) => (body.data.createNote ?? body.data.updateNote).documentId,
    },
  };

  const findVersions = () =>
    strapi.db.query(HISTORY_VERSION_UID).findMany({ where: { contentType: noteUid } });

  const setContentApiHistory = (isEnabled: boolean) => strapi.config.set(CONFIG_KEY, isEnabled);

  beforeAll(async () => {
    await builder.addContentType(noteModel).build();
    strapi = await createStrapiInstance();

    await grantNoteWrites('public');
    await grantNoteWrites('authenticated');

    apiTokenRequest = await createApiTokenRequest();
    endUserRequest = await createEndUserRequest();
    publicRequest = createRequest({ strapi });
  });

  afterAll(async () => {
    await strapi.destroy();
    await builder.cleanup();
  });

  beforeEach(async () => {
    await strapi.db.query(HISTORY_VERSION_UID).deleteMany({ where: {} });
  });

  afterEach(() => {
    setContentApiHistory(false);
  });

  describe.each(Object.entries(apis))('%s', (_apiName, api) => {
    const actors = [
      {
        name: 'an API token',
        getRequest: () => apiTokenRequest,
        expectedActor: { type: 'api-token', token: { id: expect.anything(), name: 'Mobile app' } },
      },
      {
        name: 'an end user',
        getRequest: () => endUserRequest,
        expectedActor: { type: 'end-user', user: { id: expect.anything(), username: 'jdoe' } },
      },
      {
        name: 'a public request',
        getRequest: () => publicRequest,
        expectedActor: { type: 'unknown' },
      },
    ];

    describe.each(actors)('as $name', ({ getRequest, expectedActor }) => {
      it('creates no version when the flag is off', async () => {
        const request = getRequest();

        const created = await api.create(request)('Hello');
        await api.update(request)(api.documentIdOf(created.body), 'Hello again');

        expect(await findVersions()).toHaveLength(0);
      });

      it('creates a version on create and on update when the flag is on', async () => {
        setContentApiHistory(true);
        const request = getRequest();

        const created = await api.create(request)('Hello');
        await api.update(request)(api.documentIdOf(created.body), 'Hello again');

        const versions = await findVersions();
        expect(versions).toHaveLength(2);
        versions.forEach((version) => {
          expect(version.actor).toEqual(expectedActor);
        });
      });

      it('leaves createdBy empty', async () => {
        setContentApiHistory(true);

        await api.create(getRequest())('Hello');

        const [version] = await strapi.db
          .query(HISTORY_VERSION_UID)
          .findMany({ where: { contentType: noteUid }, populate: ['createdBy'] });
        expect(version.createdBy).toBeNull();
      });
    });
  });

  describe('REST publish through the content API', () => {
    it('creates exactly one published version', async () => {
      setContentApiHistory(true);

      await apiTokenRequest({
        method: 'POST',
        url: '/api/notes',
        qs: { status: 'published' },
        body: { data: { title: 'Hello' } },
      });

      const versions = await findVersions();
      expect(versions).toHaveLength(1);
      expect(versions[0].status).toBe('published');
    });
  });
});
