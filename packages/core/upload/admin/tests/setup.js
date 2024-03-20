import { server } from '@strapi/admin/strapi-admin/test';

import { handlers } from './handlers';

beforeAll(() => {
  server.listen();
});

beforeEach(() => {
  server.use(...handlers);
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
