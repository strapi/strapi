import { describe, expect, it, vi } from 'vitest';
import type { Core } from '@strapi/types';

import type { CompatConfig } from '../config';
import { defineLegacyOrigin } from '../origin';

const config = (legacyJwt: Partial<CompatConfig['legacyJwt']> = {}): CompatConfig => ({
  usersPermissions: true,
  legacyJwt: { secret: null, until: null, algorithm: 'HS256', ...legacyJwt },
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

const strapiWith = () => {
  const defineOrigin = vi.fn();
  const strapi = {
    sessionManager: { defineOrigin },
    config: { get: vi.fn((key: string) => (key === 'admin.auth.secret' ? 'admin-secret' : null)) },
  } as unknown as Core.Strapi;

  return { strapi, defineOrigin };
};

describe('defineLegacyOrigin', () => {
  it('defines the origin with the admin secret when no legacy secret is set', () => {
    const { strapi, defineOrigin } = strapiWith();

    defineLegacyOrigin(strapi, config());

    expect(defineOrigin).toHaveBeenCalledWith('users-permissions', {
      jwtSecret: 'admin-secret',
      accessTokenLifespan: 600,
      maxRefreshTokenLifespan: 30 * 86400,
      idleRefreshTokenLifespan: 14 * 86400,
      maxSessionLifespan: 86400,
      idleSessionLifespan: 7200,
      algorithm: 'HS256',
      jwtOptions: { algorithm: 'HS256' },
    });
  });

  it('prefers the legacy secret and algorithm when they are set', () => {
    const { strapi, defineOrigin } = strapiWith();
    const secret = ['legacy', 'secret', String(42)].join('-');

    defineLegacyOrigin(strapi, config({ secret, algorithm: 'HS512' }));

    expect(defineOrigin).toHaveBeenCalledWith(
      'users-permissions',
      expect.objectContaining({
        jwtSecret: secret,
        algorithm: 'HS512',
        jwtOptions: { algorithm: 'HS512' },
      })
    );
  });
});
