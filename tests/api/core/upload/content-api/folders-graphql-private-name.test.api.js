'use strict';

const { createStrapiInstance } = require('api-tests/strapi');
const { createAgent } = require('api-tests/agent');
const { createAuthRequest } = require('api-tests/request');

let strapi;
let rqAdmin;
let gql;
let tokenId;

const folders = {};

const createFolder = async (name, parent = null) => {
  const res = await rqAdmin({ method: 'POST', url: '/upload/folders', body: { name, parent } });

  return res.body.data;
};

describe('Upload GraphQL - folders with a private name', () => {
  beforeAll(async () => {
    strapi = await createStrapiInstance({
      bypassAuth: false,
      async bootstrap({ strapi: instance }) {
        instance.config.set('plugin::graphql.v4CompatibilityMode', false);
        instance.getModel('plugin::upload.folder').attributes.name.private = true;
      },
    });
    rqAdmin = await createAuthRequest({ strapi });

    const res = await rqAdmin({
      method: 'POST',
      url: '/admin/api-tokens',
      body: { name: 'folders-graphql-private-name', lifespan: null, type: 'full-access' },
    });
    tokenId = res.body.data.id;

    const rq = createAgent(strapi, { token: res.body.data.accessKey });
    gql = (query, variables) => rq({ method: 'POST', url: '/graphql', body: { query, variables } });

    folders.root = await createFolder('Private Root');
    folders.child = await createFolder('Private Child', folders.root.id);
  });

  afterAll(async () => {
    await rqAdmin({
      method: 'POST',
      url: '/upload/actions/bulk-delete',
      body: { folderIds: [folders.root.id] },
    });
    await rqAdmin({ method: 'DELETE', url: `/admin/api-tokens/${tokenId}` });

    await strapi.destroy();
  });

  test('exposes neither name nor namePath on UploadFolder', async () => {
    const res = await gql(/* GraphQL */ `
      {
        __type(name: "UploadFolder") {
          fields {
            name
          }
        }
      }
    `);

    const fields = res.body.data.__type.fields.map((field) => field.name);

    expect(fields).toEqual(expect.arrayContaining(['documentId', 'path', 'parent']));
    expect(fields).not.toContain('name');
    expect(fields).not.toContain('namePath');
  });

  test.each([
    [
      'uploadFolders',
      /* GraphQL */ `
        query ($documentId: ID!) {
          uploadFolders(filters: { documentId: { eq: $documentId } }) {
            documentId
            namePath
          }
        }
      `,
    ],
    [
      'uploadFolder',
      /* GraphQL */ `
        query ($documentId: ID!) {
          uploadFolder(documentId: $documentId) {
            documentId
            namePath
          }
        }
      `,
    ],
  ])('%s does not leak the folder names through namePath', async (_, query) => {
    const res = await gql(query, { documentId: folders.child.documentId });

    expect(res.body.errors).toEqual([
      expect.objectContaining({ message: expect.stringMatching(/Cannot query field "namePath"/) }),
    ]);
    expect(JSON.stringify(res.body)).not.toMatch(/Private (Root|Child)/);
  });
});
