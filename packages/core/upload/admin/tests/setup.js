import { TestUtils } from '@strapi/admin/strapi-admin';

import { handlers } from './handlers';

beforeAll(() => {
  TestUtils.server.listen();
});

beforeEach(() => {
  TestUtils.server.use(...handlers);
});

afterEach(() => {
  TestUtils.server.resetHandlers();
});

afterAll(() => {
  TestUtils.server.close();
});
