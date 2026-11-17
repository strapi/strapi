import { describe, expect, it } from 'vitest';
import type { Core } from '@strapi/types';

import { readCompatConfig } from '../config';
import {
  clearRefreshCookie,
  readRefreshToken,
  wantsRefreshCookie,
  writeRefreshCookie,
} from '../refresh-cookie';

const configWith = (values: Record<string, unknown> = {}) =>
  readCompatConfig({
    config: {
      get: (path: string) => values[path.replace('plugin::end-users.compat.', '')],
    },
  } as unknown as Core.Strapi);

const withCookie = (cookie: string) => new Headers({ cookie });

describe('the refresh cookie', () => {
  it('writes the cookie with the configured name, secure, sameSite, path, domain and maxAge', () => {
    const cfg = configWith({
      'refresh.cookie.name': 'sid',
      'refresh.cookie.secure': true,
      'refresh.cookie.sameSite': 'strict',
      'refresh.cookie.path': '/api',
      'refresh.cookie.domain': 'example.com',
      'refresh.cookie.maxAge': 3600,
    });

    expect(writeRefreshCookie(cfg, 'tok.en')).toBe(
      'sid=tok.en; Max-Age=3600; Path=/api; Domain=example.com; HttpOnly; Secure; SameSite=Strict'
    );
  });

  it('writes the defaults: the name users-permissions used, no Max-Age, lax, the root path', () => {
    const cfg = configWith({ 'refresh.cookie.secure': false });

    expect(writeRefreshCookie(cfg, 'abc')).toBe(
      'strapi_up_refresh=abc; Path=/; HttpOnly; SameSite=Lax'
    );
  });

  it('keeps a token with reserved characters whole on the way out and back in', () => {
    const cfg = configWith();
    const token = 'abc.d+e/f=g%3D';
    const written = writeRefreshCookie(cfg, token).split(';')[0];

    expect(written).not.toMatch(/[+/]/);
    expect(readRefreshToken(cfg, withCookie(written), {})).toBe(token);
  });

  it('clears the cookie with the attributes it was set with', () => {
    const cfg = configWith({ 'refresh.cookie.path': '/api', 'refresh.cookie.secure': true });
    const cleared = clearRefreshCookie(cfg);

    expect(cleared).toMatch(/^strapi_up_refresh=;/);
    expect(cleared).toContain('Path=/api');
    expect(cleared).toContain('Expires=Thu, 01 Jan 1970');
    expect(cleared).toContain('Max-Age=0');
    expect(cleared).toContain('HttpOnly');
    expect(cleared).toContain('Secure');
  });

  it('reads the cookie before the body', () => {
    const cfg = configWith();

    expect(
      readRefreshToken(cfg, withCookie('a=1; strapi_up_refresh=from-cookie'), {
        refreshToken: 'from-body',
      })
    ).toBe('from-cookie');
    expect(readRefreshToken(cfg, withCookie('a=1'), { refreshToken: 'from-body' })).toBe(
      'from-body'
    );
    expect(readRefreshToken(cfg, undefined, { refreshToken: 'from-body' })).toBe('from-body');
  });

  it('finds nothing in a body that has no string token, or an empty cookie', () => {
    const cfg = configWith();

    expect(readRefreshToken(cfg, undefined, {})).toBeUndefined();
    expect(readRefreshToken(cfg, undefined, { refreshToken: 5 })).toBeUndefined();
    expect(readRefreshToken(cfg, withCookie('strapi_up_refresh='), null)).toBeUndefined();
  });

  it('asks for the cookie by configuration or by the header, and by nothing else', () => {
    const header = (value: string) => new Headers({ 'x-strapi-refresh-cookie': value });

    expect(wantsRefreshCookie(configWith(), undefined)).toBe(false);
    expect(wantsRefreshCookie(configWith(), header('httpOnly'))).toBe(true);
    expect(wantsRefreshCookie(configWith(), header('yes'))).toBe(false);
    expect(wantsRefreshCookie(configWith({ 'refresh.httpOnly': true }), undefined)).toBe(true);
  });
});
