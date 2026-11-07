import { describe, test, expect, vi } from 'vitest';
import type { Core } from '@strapi/types';
import { McpOAuthConfiguration } from '../../configuration';
import {
  createAuthorizationServerMetadataHandler,
  createProtectedResourceMetadataHandler,
} from '../metadata';
import type { McpOAuthHandlerDependencies } from '../types';

const makeConfig = (overrides: Record<string, unknown> = {}) => {
  const strapi = {
    config: {
      get: vi.fn((key: string, defaultValue?: unknown) => {
        const values: Record<string, unknown> = {
          'server.absoluteUrl': 'http://localhost:1337',
          ...overrides,
        };
        return key in values ? values[key] : defaultValue;
      }),
    },
    log: { warn: vi.fn() },
  } as unknown as Core.Strapi;

  return new McpOAuthConfiguration(strapi, '/mcp');
};

const makeCtx = () => ({ body: undefined as unknown }) as any;

describe('metadata handlers', () => {
  test('describes the protected resource (RFC 9728)', async () => {
    const handler = createProtectedResourceMetadataHandler({
      config: makeConfig(),
    } as unknown as McpOAuthHandlerDependencies);
    const ctx = makeCtx();

    await handler(ctx, vi.fn());

    expect(ctx.body).toEqual({
      resource: 'http://localhost:1337/mcp',
      authorization_servers: ['http://localhost:1337'],
      bearer_methods_supported: ['header'],
    });
  });

  test('describes the authorization server (RFC 8414)', async () => {
    const handler = createAuthorizationServerMetadataHandler({
      config: makeConfig(),
    } as unknown as McpOAuthHandlerDependencies);
    const ctx = makeCtx();

    await handler(ctx, vi.fn());

    expect(ctx.body).toEqual({
      issuer: 'http://localhost:1337',
      authorization_endpoint: 'http://localhost:1337/mcp/oauth/authorize',
      token_endpoint: 'http://localhost:1337/mcp/oauth/token',
      registration_endpoint: 'http://localhost:1337/mcp/oauth/register',
      revocation_endpoint: 'http://localhost:1337/mcp/oauth/revoke',
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none', 'client_secret_basic', 'client_secret_post'],
    });
  });

  test('omits the registration endpoint when dynamic client registration is off', async () => {
    const handler = createAuthorizationServerMetadataHandler({
      config: makeConfig({ 'server.mcp.oauth.dynamicClientRegistration': false }),
    } as unknown as McpOAuthHandlerDependencies);
    const ctx = makeCtx();

    await handler(ctx, vi.fn());

    expect(ctx.body).not.toHaveProperty('registration_endpoint');
  });
});
