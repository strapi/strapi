import { TestUtils } from '@strapi/admin/strapi-admin';

beforeAll(() => {
  TestUtils.server.listen();
});

afterEach(() => {
  TestUtils.server.resetHandlers();
});

afterAll(() => {
  TestUtils.server.close();
});
