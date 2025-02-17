import { TextEncoder } from 'util';

import { server } from './server';

// Note: We set this here because setting it in the config is broken for projects: https://github.com/jestjs/jest/issues/9696
// Also, there are issues with async tests unless it is set at global scope: https://github.com/jestjs/jest/issues/11543
jest.setTimeout(60 * 1000);

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
