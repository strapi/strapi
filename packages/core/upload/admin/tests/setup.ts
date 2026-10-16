import { server } from '@strapi/admin/strapi-admin/test';

import { handlers } from './handlers';

// Mock hooks that are used across multiple components
jest.mock('../src/legacy/hooks/useTracking');
jest.mock('../src/legacy/hooks/useSettings');

// On import, Mux Player checks volume support with an AbortSignal listener, which jsdom
// rejects because the test environment uses Node's AbortController. No test plays a video.
jest.mock('@mux/mux-player-react', () => ({ __esModule: true, default: () => null }));

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
