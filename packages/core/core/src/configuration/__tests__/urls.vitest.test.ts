import { describe, test, expect } from 'vitest';

import { getConfigUrls } from '../urls';

describe('getConfigUrls', () => {
  test('trims slashes and spaces around relative urls', () => {
    expect(
      getConfigUrls({ server: { url: ' /api// ' }, admin: { url: '// dashboard / ' } })
    ).toEqual({ serverUrl: '/api', adminUrl: '/api/dashboard', adminPath: '/api/dashboard' });
  });

  test('defaults to an empty server url and /admin', () => {
    expect(getConfigUrls({ server: {}, admin: {} })).toEqual({
      serverUrl: '',
      adminUrl: '/admin',
      adminPath: '/admin',
    });
  });

  test('trims trailing slashes from absolute urls and keeps the admin path', () => {
    expect(
      getConfigUrls({
        server: { url: 'http://localhost:1337///' },
        admin: { url: 'http://localhost:1337/admin///' },
      })
    ).toEqual({
      serverUrl: 'http://localhost:1337',
      adminUrl: 'http://localhost:1337/admin',
      adminPath: '/admin',
    });
  });
});
