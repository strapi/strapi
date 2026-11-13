import { describe, test, expect, vi } from 'vitest';
import type { Core } from '@strapi/types';
import { McpOAuthConfiguration } from '../configuration';
import { createMcpOAuthConsentRouter, createMcpOAuthRoutes } from '../routes';
import type { McpOAuthConsentHandlers, McpOAuthRouteHandlers } from '../routes';

const makeStrapi = (config: Record<string, unknown> = {}): Core.Strapi =>
  ({
    config: {
      get: vi.fn((key: string, defaultValue?: unknown) =>
        key in config ? config[key] : defaultValue
      ),
    },
    log: { warn: vi.fn() },
  }) as unknown as Core.Strapi;

const makeHandlers = (): McpOAuthRouteHandlers => ({
  protectedResourceMetadata: vi.fn(),
  authorizationServerMetadata: vi.fn(),
  authorize: vi.fn(),
  token: vi.fn(),
  register: vi.fn(),
  revoke: vi.fn(),
});

describe('createMcpOAuthRoutes', () => {
  test('exposes the discovery, authorize, token, revoke, and register endpoints', () => {
    const config = new McpOAuthConfiguration(makeStrapi(), '/mcp');
    const routes = createMcpOAuthRoutes(config, '/mcp', makeHandlers());

    expect(routes.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'GET /.well-known/oauth-protected-resource',
      'GET /.well-known/oauth-protected-resource/mcp',
      'GET /.well-known/oauth-authorization-server',
      'GET /.well-known/oauth-authorization-server/mcp',
      'GET /mcp/oauth/authorize',
      'POST /mcp/oauth/token',
      'POST /mcp/oauth/revoke',
      'POST /mcp/oauth/register',
    ]);
  });

  test('disables Strapi route auth on every endpoint', () => {
    const config = new McpOAuthConfiguration(makeStrapi(), '/mcp');
    const routes = createMcpOAuthRoutes(config, '/mcp', makeHandlers());

    for (const route of routes) {
      expect(route.config?.auth).toBe(false);
    }
  });

  test('rate limits the registration endpoint', () => {
    const config = new McpOAuthConfiguration(makeStrapi(), '/mcp');
    const routes = createMcpOAuthRoutes(config, '/mcp', makeHandlers());

    const register = routes.find(({ path }) => path === '/mcp/oauth/register');
    // The static prefixKey keys the limit on IP + endpoint: the default key starts with
    // request.body.email, which an anonymous caller can vary to dodge the limit.
    // `enabled: true` decouples it from admin.rateLimit.enabled.
    expect(register?.config?.middlewares).toEqual([
      { name: 'admin::rateLimit', config: { enabled: true, prefixKey: 'mcp:oauth:register' } },
    ]);
  });

  test('merges server.mcp.oauth.registrationRateLimit into the register rate limit', () => {
    const config = new McpOAuthConfiguration(
      makeStrapi({ 'server.mcp.oauth.registrationRateLimit': { max: 50, interval: { min: 1 } } }),
      '/mcp'
    );
    const routes = createMcpOAuthRoutes(config, '/mcp', makeHandlers());
    const register = routes.find(({ path }) => path === '/mcp/oauth/register');

    expect(register?.config?.middlewares).toEqual([
      {
        name: 'admin::rateLimit',
        config: { enabled: true, prefixKey: 'mcp:oauth:register', max: 50, interval: { min: 1 } },
      },
    ]);
  });

  test('registrationRateLimit.enabled: false is forwarded to the middleware', () => {
    const config = new McpOAuthConfiguration(
      makeStrapi({ 'server.mcp.oauth.registrationRateLimit': { enabled: false } }),
      '/mcp'
    );
    const routes = createMcpOAuthRoutes(config, '/mcp', makeHandlers());
    const register = routes.find(({ path }) => path === '/mcp/oauth/register');

    expect(register?.config?.middlewares).toEqual([
      { name: 'admin::rateLimit', config: { enabled: false, prefixKey: 'mcp:oauth:register' } },
    ]);
  });

  test('omits the registration endpoint when dynamic client registration is disabled', () => {
    const config = new McpOAuthConfiguration(
      makeStrapi({ 'server.mcp.oauth.dynamicClientRegistration': false }),
      '/mcp'
    );
    const routes = createMcpOAuthRoutes(config, '/mcp', makeHandlers());

    expect(routes.some(({ path }) => path === '/mcp/oauth/register')).toBe(false);
  });
});

describe('createMcpOAuthConsentRouter', () => {
  test('mounts admin-typed consent routes guarded by the authenticated-admin policy', () => {
    const handlers: McpOAuthConsentHandlers = {
      getAuthorizationRequest: vi.fn(),
      submitConsent: vi.fn(),
    };

    const router = createMcpOAuthConsentRouter(handlers);

    expect(router.type).toBe('admin');
    expect(router.prefix).toBe('/admin');
    expect(router.routes.map(({ method, path }) => `${method} ${path}`)).toEqual([
      'GET /mcp/oauth/authorization-request',
      'POST /mcp/oauth/consent',
    ]);

    for (const route of router.routes) {
      expect(route.config?.policies).toEqual(['admin::isAuthenticatedAdmin']);
      // The consent routes rely on admin authentication: auth must NOT be disabled.
      expect(route.config?.auth).toBeUndefined();
    }
  });
});
