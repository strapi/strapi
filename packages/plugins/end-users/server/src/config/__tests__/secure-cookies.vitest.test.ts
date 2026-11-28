import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import { secureCookieOptions } from '../secure-cookies';

const production = { NODE_ENV: 'production' };

const fakeStrapi = (url: string) =>
  ({
    config: { get: (path: string) => (path === 'server.url' ? url : undefined) },
    log: { warn: vi.fn() },
  }) as unknown as Core.Strapi & { log: { warn: ReturnType<typeof vi.fn> } };

describe('secureCookieOptions', () => {
  it('makes the session cookie Secure on an https address outside development', () => {
    expect(secureCookieOptions(fakeStrapi('https://api.example.com'), production)).toEqual({
      useSecureCookies: true,
    });
    expect(secureCookieOptions(fakeStrapi('https://localhost'), { NODE_ENV: 'staging' })).toEqual({
      useSecureCookies: true,
    });
  });

  it('changes nothing in development, an unset NODE_ENV included', () => {
    const strapi = fakeStrapi('http://api.example.com');

    expect(secureCookieOptions(strapi, { NODE_ENV: 'development' })).toEqual({});
    expect(secureCookieOptions(fakeStrapi('https://api.example.com'), {})).toEqual({});
    expect(strapi.log.warn).not.toHaveBeenCalled();
  });

  it('says nothing for plain http on a loopback host', () => {
    for (const url of [
      'http://localhost:1337',
      'http://api.localhost',
      'http://127.0.0.1:1337',
      'http://127.1.2.3',
      'http://[::1]:1337',
    ]) {
      const strapi = fakeStrapi(url);

      expect(secureCookieOptions(strapi, production), url).toEqual({});
      expect(strapi.log.warn, url).not.toHaveBeenCalled();
    }
  });

  it('starts on plain http elsewhere, and says once that the session cookie is not Secure', () => {
    for (const url of [
      'http://api.example.com',
      'http://0.0.0.0:1337',
      'http://localhost.evil.net',
    ]) {
      const strapi = fakeStrapi(url);

      expect(secureCookieOptions(strapi, production), url).toEqual({});
      secureCookieOptions(strapi, production);

      expect(strapi.log.warn, url).toHaveBeenCalledTimes(1);
      expect(strapi.log.warn.mock.calls[0][0], url).toMatch(/session cookie is not Secure/);
      expect(strapi.log.warn.mock.calls[0][0], url).toMatch(/server\.url/);
    }
  });
});
