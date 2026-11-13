import { describe, test, expect, vi } from 'vitest';
import type { Core } from '@strapi/types';
import { McpOAuthConfiguration } from '../configuration';
import { createMcpOAuthModule } from '../index';

const makeStrapi = () => {
  const strapi = {
    config: {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const values: Record<string, unknown> = {
          'server.absoluteUrl': 'http://localhost:1337',
          'admin.auth.secret': 'admin-secret',
        };
        return key in values ? values[key] : defaultValue;
      }),
    },
    log: { info: vi.fn(), warn: vi.fn() },
    sessionManager: Object.assign(vi.fn(), { defineOrigin: vi.fn() }),
    server: { routes: vi.fn() },
    db: { query: vi.fn() },
  };

  return strapi as unknown as Core.Strapi & typeof strapi;
};

describe('createMcpOAuthModule', () => {
  test('start() registers the mcp session origin and mounts both route sets', () => {
    const strapi = makeStrapi();
    const config = new McpOAuthConfiguration(strapi, '/mcp');

    const module = createMcpOAuthModule(strapi, config);
    module.start('/mcp');

    expect(strapi.sessionManager.defineOrigin).toHaveBeenCalledWith('mcp', {
      jwtSecret: config.getJwtSecret(),
      accessTokenLifespan: 30 * 60,
      maxRefreshTokenLifespan: 30 * 24 * 60 * 60,
      idleRefreshTokenLifespan: 14 * 24 * 60 * 60,
      maxSessionLifespan: 30 * 24 * 60 * 60,
      idleSessionLifespan: 14 * 24 * 60 * 60,
    });

    // One unprefixed OAuth route set, one admin consent router.
    expect(strapi.server.routes).toHaveBeenCalledTimes(2);
    const [oauthRoutes] = (strapi.server.routes as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(Array.isArray(oauthRoutes)).toBe(true);
    const [consentRouter] = (strapi.server.routes as ReturnType<typeof vi.fn>).mock.calls[1];
    expect(consentRouter).toMatchObject({ type: 'admin', prefix: '/admin' });
  });

  test('exposes the access token authenticator', () => {
    const strapi = makeStrapi();
    const config = new McpOAuthConfiguration(strapi, '/mcp');

    const module = createMcpOAuthModule(strapi, config);

    expect(typeof module.accessTokenAuthenticator.authenticate).toBe('function');
  });
});
