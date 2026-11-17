import { afterEach, describe, expect, it } from 'vitest';
import type { Core } from '@strapi/types';

import { readCompatConfig } from '../config';

const strapiWith = (values: Record<string, unknown> = {}) =>
  ({
    config: { get: (key: string) => values[key.replace('plugin::end-users.compat.', '')] },
  }) as unknown as Core.Strapi;

const NODE_ENV = process.env.NODE_ENV;

afterEach(() => {
  process.env.NODE_ENV = NODE_ENV;
});

describe('readCompatConfig', () => {
  it('fills every default, including the cookie name and a secure flag that follows NODE_ENV', () => {
    process.env.NODE_ENV = 'development';

    expect(readCompatConfig(strapiWith())).toEqual({
      usersPermissions: false,
      legacyJwt: { secret: null, until: null, algorithm: 'HS256' },
      refresh: {
        enabled: false,
        httpOnly: false,
        cookie: {
          name: 'strapi_up_refresh',
          secure: false,
          sameSite: 'lax',
          path: '/',
          domain: null,
          maxAge: null,
        },
      },
      connect: { callbacks: {} },
    });

    process.env.NODE_ENV = 'production';

    expect(readCompatConfig(strapiWith()).refresh.cookie.secure).toBe(true);
    expect(
      readCompatConfig(strapiWith({ 'refresh.cookie.secure': false })).refresh.cookie.secure
    ).toBe(false);
  });

  it('reads a date-only until as the end of that day in UTC', () => {
    const { until } = readCompatConfig(strapiWith({ 'legacyJwt.until': '2027-06-30' })).legacyJwt;

    expect(until?.toISOString()).toBe('2027-06-30T23:59:59.999Z');
  });

  it('reads a full timestamp as given', () => {
    const { until } = readCompatConfig(
      strapiWith({ 'legacyJwt.until': '2027-06-30T12:00:00Z' })
    ).legacyJwt;

    expect(until?.toISOString()).toBe('2027-06-30T12:00:00.000Z');
  });

  it('keeps what the project set', () => {
    const config = readCompatConfig(
      strapiWith({
        usersPermissions: true,
        'legacyJwt.secret': 'old',
        'legacyJwt.algorithm': 'HS512',
        'refresh.enabled': true,
        'refresh.httpOnly': true,
        'refresh.cookie.name': 'rt',
        'refresh.cookie.sameSite': 'none',
        'refresh.cookie.path': '/api',
        'refresh.cookie.domain': '.example.com',
        'refresh.cookie.maxAge': 60,
        'connect.callbacks': { github: 'https://app.example.com/cb' },
      })
    );

    expect(config.usersPermissions).toBe(true);
    expect(config.legacyJwt).toMatchObject({ secret: 'old', algorithm: 'HS512' });
    expect(config.refresh).toEqual({
      enabled: true,
      httpOnly: true,
      cookie: {
        name: 'rt',
        secure: false,
        sameSite: 'none',
        path: '/api',
        domain: '.example.com',
        maxAge: 60,
      },
    });
    expect(config.connect.callbacks).toEqual({ github: 'https://app.example.com/cb' });
  });
});
