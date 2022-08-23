'use strict';

const { createStrapiInstance } = require('../../../../../test/helpers/strapi');
const { createAuthRequest } = require('../../../../../test/helpers/request');

describe('Admin API Token v2 usage (e2e)', () => {
  // let rq;
  // let strapi;

  // const deleteAllTokens = async () => {
  //   const tokens = await strapi.admin.services['api-token'].list();
  //   const promises = [];
  //   tokens.forEach(({ id }) => {
  //     promises.push(strapi.admin.services['api-token'].revoke(id));
  //   });
  //   await Promise.all(promises);
  // };

  // // Initialization Actions
  // beforeAll(async () => {
  //   strapi = await createStrapiInstance();
  //   rq = await createAuthRequest({ strapi });

  //   // delete tokens
  //   await deleteAllTokens();
  // });

  // // Cleanup actions
  // afterAll(async () => {
  //   await strapi.destroy();
  // });

  // // create a predictable valid token that we can test with (delete, list, etc)
  // let currentTokens = 0;
  // const createValidToken = async (token = {}) => {
  //   const body = {
  //     type: 'read-only',
  //     // eslint-disable-next-line no-plusplus
  //     name: `token_${String(currentTokens++)}`,
  //     description: 'generic description',
  //     ...token,
  //   };

  //   const req = await rq({
  //     url: '/admin/api-tokens',
  //     method: 'POST',
  //     body,
  //   });

  //   expect(req.status).toEqual(201);
  //   return req.body.data;
  // };

  // const makeRequest = async () => {};

  // test('Token can be used to access resource it has permissions for', async () => {
  //   const token = await createValidToken({ type: 'read-only' });
  // });
  // test("Token can't access resource it doesn't have permission for", async () => {
  //   const token = await createValidToken({ type: 'read-only' });
  // });

  test.todo('Regenerated access key works');
  test.todo('Custom tokens access content for which they are authorized');
  test.todo('Custom tokens fail to access content for which they are not authorized');
  test.todo("Expired token can't be used");
});
