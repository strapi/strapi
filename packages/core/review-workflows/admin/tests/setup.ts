import { server } from '@strapi/admin/strapi-admin/test';

import { HANDLERS } from './handlers';

beforeAll(() => {
  server.listen();
});

beforeEach(() => {
  server.use(...HANDLERS);
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
