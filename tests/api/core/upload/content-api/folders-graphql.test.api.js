'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAgent } = require('api-tests/agent');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rqAdmin;
let gqlFullAccess;

const folders = {};
const tokenIds = [];

const FOLDER_FIELDS = /* GraphQL */ `
  documentId
  name
  path
  namePath
  parent {
    documentId
  }
`;

const LIST_FOLDERS = /* GraphQL */ `
  query listFolders($filters: UploadFolderFiltersInput, $pagination: PaginationArg) {
    uploadFolders(filters: $filters, pagination: $pagination, sort: "name:asc") {
      ${FOLDER_FIELDS}
    }
  }
`;

const GET_FOLDER = /* GraphQL */ `
  query getFolder($documentId: ID!) {
    uploadFolder(documentId: $documentId) {
      documentId
      name
    }
  }
`;

const createFolder = async (name, parent = null) => {
  const res = await rqAdmin({ method: 'POST', url: '/upload/folders', body: { name, parent } });

  return res.body.data;
};

const createGraphQLRequest = (token) => {
  const rq = createAgent(strapi, token ? { token } : {});

  return (query, variables) => rq({ method: 'POST', url: '/graphql', body: { query, variables } });
};

const createTokenGraphQLRequest = async (body) => {
  const res = await rqAdmin({
    method: 'POST',
    url: '/admin/api-tokens',
    body: { name: `folders-graphql-${tokenIds.length}`, lifespan: null, ...body },
  });

  tokenIds.push(res.body.data.id);

  return createGraphQLRequest(res.body.data.accessKey);
};

const expectForbidden = (res) => {
  // A non-null list query nulls `data`, a nullable single query only nulls its field.
  Object.values(res.body.data ?? {}).forEach((value) => expect(value).toBeNull());
  expect(res.body.errors).toEqual([expect.objectContaining({ message: 'Forbidden access' })]);
};

describe('Upload GraphQL - read-only folder queries', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance({
      bypassAuth: false,
      async bootstrap({ strapi: instance }) {
        // The API runner defaults this legacy mode to true; these tests cover the v5 schema.
        instance.config.set('plugin::graphql.v4CompatibilityMode', false);
      },
    });
    rqAdmin = await createAuthRequest({ strapi });
    gqlFullAccess = await createTokenGraphQLRequest({ type: 'full-access' });

    folders.clients = await createFolder('Clients');
    folders.acme = await createFolder('Acme', folders.clients.id);
    folders.year = await createFolder('2026', folders.acme.id);
    folders.archive = await createFolder('Archive');
  });

  afterAll(async () => {
    await rqAdmin({
      method: 'POST',
      url: '/upload/actions/bulk-delete',
      body: { folderIds: [folders.clients.id, folders.archive.id] },
    });
    await Promise.all(
      tokenIds.map((id) => rqAdmin({ method: 'DELETE', url: `/admin/api-tokens/${id}` }))
    );

    await strapi.destroy();
  });

  describe('Permissions', () => {
    test('refuses a request without a token', async () => {
      const gqlPublic = createGraphQLRequest();

      expectForbidden(await gqlPublic(LIST_FOLDERS));
    });

    test('refuses a custom token without the folder permissions', async () => {
      const gql = await createTokenGraphQLRequest({
        type: 'custom',
        permissions: ['plugin::upload.content-api.find'],
      });

      expectForbidden(await gql(LIST_FOLDERS));
      expectForbidden(await gql(GET_FOLDER, { documentId: folders.acme.documentId }));
    });

    test('grants listing and reading one folder separately', async () => {
      const gqlFind = await createTokenGraphQLRequest({
        type: 'custom',
        permissions: ['plugin::upload.folder.find'],
      });
      const gqlFindOne = await createTokenGraphQLRequest({
        type: 'custom',
        permissions: ['plugin::upload.folder.findOne'],
      });
      const one = { documentId: folders.acme.documentId };

      const findList = await gqlFind(LIST_FOLDERS);
      expect(findList.body.errors).toBeUndefined();
      expect(findList.body.data.uploadFolders.map((folder) => folder.documentId)).toEqual(
        expect.arrayContaining([folders.clients.documentId, folders.acme.documentId])
      );
      expectForbidden(await gqlFind(GET_FOLDER, one));

      expectForbidden(await gqlFindOne(LIST_FOLDERS));
      const findOne = await gqlFindOne(GET_FOLDER, one);
      expect(findOne.body).toEqual({
        data: { uploadFolder: { documentId: folders.acme.documentId, name: 'Acme' } },
      });
    });

    test('needs the list permission to read the parent', async () => {
      const gqlFindOne = await createTokenGraphQLRequest({
        type: 'custom',
        permissions: ['plugin::upload.folder.findOne'],
      });

      const res = await gqlFindOne(
        /* GraphQL */ `
          query getFolder($documentId: ID!) {
            uploadFolder(documentId: $documentId) {
              name
              parent {
                documentId
              }
            }
          }
        `,
        { documentId: folders.acme.documentId }
      );

      expect(res.body.data.uploadFolder).toEqual({ name: 'Acme', parent: null });
      expect(res.body.errors).toEqual([
        expect.objectContaining({ message: 'Forbidden access', path: ['uploadFolder', 'parent'] }),
      ]);
    });
  });

  describe('Schema', () => {
    const getTypeFields = async (name, kind = 'fields') => {
      const res = await gqlFullAccess(
        /* GraphQL */ `
          query type($name: String!) {
            __type(name: $name) {
              fields {
                name
              }
              inputFields {
                name
              }
            }
          }
        `,
        { name }
      );

      return res.body.data.__type[kind].map((field) => field.name);
    };

    test('exposes no folder mutation', async () => {
      const mutations = await getTypeFields('Mutation');

      expect(mutations.filter((name) => /folder/i.test(name))).toEqual([]);
    });

    test('exposes the folder fields REST returns, without files, children or pathId', async () => {
      const fields = await getTypeFields('UploadFolder');

      expect(fields).toEqual(
        expect.arrayContaining(['documentId', 'name', 'path', 'namePath', 'parent'])
      );
      expect(fields.filter((name) => /^(files|children|pathId)/.test(name))).toEqual([]);
    });

    test('cannot filter folders by their files', async () => {
      const filters = await getTypeFields('UploadFolderFiltersInput', 'inputFields');

      expect(filters).toEqual(expect.arrayContaining(['name', 'path', 'parent']));
      expect(filters).not.toContain('files');
    });
  });

  describe('Queries', () => {
    test('lists root folders with a null parent filter', async () => {
      const res = await gqlFullAccess(LIST_FOLDERS, {
        filters: { parent: { documentId: { null: true } } },
      });

      expect(res.body.errors).toBeUndefined();
      expect(res.body.data.uploadFolders).toEqual([
        expect.objectContaining({ name: 'Archive', parent: null }),
        expect.objectContaining({ name: 'Clients', parent: null }),
      ]);
    });

    test('lists the children of a folder', async () => {
      const res = await gqlFullAccess(LIST_FOLDERS, {
        filters: { parent: { documentId: { eq: folders.clients.documentId } } },
      });

      expect(res.body.data.uploadFolders).toEqual([
        expect.objectContaining({
          name: 'Acme',
          parent: { documentId: folders.clients.documentId },
        }),
      ]);
    });

    test('returns both paths of a folder nested three levels deep', async () => {
      const res = await gqlFullAccess(LIST_FOLDERS, {
        filters: { documentId: { eq: folders.year.documentId } },
      });

      expect(res.body.data.uploadFolders).toEqual([
        {
          documentId: folders.year.documentId,
          name: '2026',
          path: folders.year.path,
          namePath: '/Clients/Acme/2026',
          parent: { documentId: folders.acme.documentId },
        },
      ]);
    });

    test('resolves the name path of every folder on a page', async () => {
      const res = await gqlFullAccess(LIST_FOLDERS, {
        filters: { path: { startsWith: folders.clients.path } },
      });

      expect(res.body.data.uploadFolders.map(({ namePath }) => namePath)).toEqual([
        '/Clients/Acme/2026',
        '/Clients/Acme',
        '/Clients',
      ]);
    });

    test('paginates the list', async () => {
      const res = await gqlFullAccess(/* GraphQL */ `
        {
          uploadFolders_connection(pagination: { page: 1, pageSize: 2 }, sort: "name:asc") {
            nodes {
              name
            }
            pageInfo {
              page
              pageSize
              pageCount
              total
            }
          }
        }
      `);

      expect(res.body.data.uploadFolders_connection).toEqual({
        nodes: [{ name: '2026' }, { name: 'Acme' }],
        pageInfo: { page: 1, pageSize: 2, pageCount: 2, total: 4 },
      });
    });
  });
});
