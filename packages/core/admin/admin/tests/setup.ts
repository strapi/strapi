import { TextEncoder } from 'util';

import { server } from './server';

// Jest doesn't have access to TextEncoder
// See https://github.com/inrupt/solid-client-authn-js/issues/1676#issuecomment-917016646
global.TextEncoder = TextEncoder;

beforeAll(() => {
  server.listen();
});

afterEach(() => {
  server.resetHandlers();
});

afterAll(() => {
  server.close();
});
