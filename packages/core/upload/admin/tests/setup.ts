import { server } from '@strapi/admin/strapi-admin/test';

import { handlers } from './handlers';

// Mock hooks that are used across multiple components
jest.mock('../src/hooks/useTracking');
jest.mock('../src/hooks/useSettings');

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
