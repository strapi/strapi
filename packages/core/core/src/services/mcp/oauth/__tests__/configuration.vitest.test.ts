import { describe, test, expect, vi } from 'vitest';
import type { Core } from '@strapi/types';
import { McpOAuthConfiguration } from '../configuration';

const makeStrapi = (config: Record<string, unknown> = {}): Core.Strapi =>
  ({
    config: {
      get: vi.fn((key: string, defaultValue?: unknown) =>
        key in config ? config[key] : defaultValue
      ),
    },
    log: { warn: vi.fn() },
  }) as unknown as Core.Strapi;

describe('McpOAuthConfiguration', () => {
  test('is disabled by default and requires strictly true', () => {
    expect(new McpOAuthConfiguration(makeStrapi(), '/mcp').isEnabled()).toBe(false);
    expect(
      new McpOAuthConfiguration(
        makeStrapi({ 'server.mcp.oauth.enabled': 'true' }),
        '/mcp'
      ).isEnabled()
    ).toBe(false);
    expect(
      new McpOAuthConfiguration(
        makeStrapi({ 'server.mcp.oauth.enabled': true }),
        '/mcp'
      ).isEnabled()
    ).toBe(true);
  });

  test('dynamic client registration defaults to enabled', () => {
    expect(
      new McpOAuthConfiguration(makeStrapi(), '/mcp').isDynamicClientRegistrationEnabled()
    ).toBe(true);
    expect(
      new McpOAuthConfiguration(
        makeStrapi({ 'server.mcp.oauth.dynamicClientRegistration': false }),
        '/mcp'
      ).isDynamicClientRegistrationEnabled()
    ).toBe(false);
  });

  test('derives issuer-based URLs from server.absoluteUrl', () => {
    const config = new McpOAuthConfiguration(
      makeStrapi({ 'server.absoluteUrl': 'https://api.example.com/' }),
      '/mcp'
    );

    expect(config.issuer).toBe('https://api.example.com');
    expect(config.resource).toBe('https://api.example.com/mcp');
    expect(config.protectedResourceMetadataUrl).toBe(
      'https://api.example.com/.well-known/oauth-protected-resource/mcp'
    );
    expect(config.authorizationEndpoint).toBe('https://api.example.com/mcp/oauth/authorize');
    expect(config.tokenEndpoint).toBe('https://api.example.com/mcp/oauth/token');
  });

  test('builds the consent page URL from admin.absoluteUrl', () => {
    const config = new McpOAuthConfiguration(
      makeStrapi({ 'admin.absoluteUrl': 'https://api.example.com/admin' }),
      '/mcp'
    );

    expect(config.consentPageUrl).toBe('https://api.example.com/admin/mcp/oauth/consent');
  });

  test('parses lifespans, tolerating env strings and falling back on invalid values', () => {
    const strapi = makeStrapi({
      'server.mcp.oauth.accessTokenLifespan': '900',
      'server.mcp.oauth.authorizationCodeLifespan': 'nope',
    });
    const config = new McpOAuthConfiguration(strapi, '/mcp');

    expect(config.accessTokenLifespan).toBe(900);
    expect(config.authorizationCodeLifespan).toBe(120);
    expect(config.idleRefreshTokenLifespan).toBe(14 * 24 * 60 * 60);
    expect(config.maxRefreshTokenLifespan).toBe(30 * 24 * 60 * 60);
    expect(config.consentTicketLifespan).toBe(300);
  });

  test('derives a JWT secret distinct from admin.auth.secret, and throws without one', () => {
    const config = new McpOAuthConfiguration(
      makeStrapi({ 'admin.auth.secret': 'admin-secret' }),
      '/mcp'
    );

    const secret = config.getJwtSecret();
    expect(secret).not.toBe('admin-secret');
    expect(secret).toMatch(/^[0-9a-f]{64}$/);
    // Deterministic for the same input
    expect(config.getJwtSecret()).toBe(secret);

    expect(() => new McpOAuthConfiguration(makeStrapi(), '/mcp').getJwtSecret()).toThrow(
      /admin\.auth\.secret/
    );
  });
});
