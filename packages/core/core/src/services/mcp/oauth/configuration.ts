import { createHmac } from 'node:crypto';
import type { Core } from '@strapi/types';
import { CONSENT_PAGE_PATH, OAUTH_PATHS } from './constants';
import { trimTrailingSlashes } from './utils/url';

export const DEFAULT_ACCESS_TOKEN_LIFESPAN = 30 * 60; // 30 minutes
export const DEFAULT_IDLE_REFRESH_TOKEN_LIFESPAN = 14 * 24 * 60 * 60; // 14 days
export const DEFAULT_MAX_REFRESH_TOKEN_LIFESPAN = 30 * 24 * 60 * 60; // 30 days
export const DEFAULT_AUTHORIZATION_CODE_LIFESPAN = 120; // 2 minutes
export const DEFAULT_CONSENT_TICKET_LIFESPAN = 300; // 5 minutes

const resolvePositiveInteger = (strapi: Core.Strapi, key: string, fallback: number): number => {
  const raw = strapi.config.get<unknown>(key);

  if (raw === undefined) {
    return fallback;
  }

  // env() returns strings
  const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;

  if (Number.isInteger(value) && (value as number) >= 1) {
    return value as number;
  }

  strapi.log.warn(
    `[MCP] Invalid ${key} (${String(raw)}). Expected an integer >= 1. Using ${fallback}.`
  );

  return fallback;
};

export class McpOAuthConfiguration {
  readonly accessTokenLifespan: number;

  readonly idleRefreshTokenLifespan: number;

  readonly maxRefreshTokenLifespan: number;

  readonly authorizationCodeLifespan: number;

  readonly consentTicketLifespan: number;

  readonly #strapi: Core.Strapi;

  readonly #mcpPath: string;

  constructor(strapi: Core.Strapi, mcpPath: string) {
    this.#strapi = strapi;
    this.#mcpPath = mcpPath;
    this.accessTokenLifespan = resolvePositiveInteger(
      strapi,
      'server.mcp.oauth.accessTokenLifespan',
      DEFAULT_ACCESS_TOKEN_LIFESPAN
    );
    this.idleRefreshTokenLifespan = resolvePositiveInteger(
      strapi,
      'server.mcp.oauth.idleRefreshTokenLifespan',
      DEFAULT_IDLE_REFRESH_TOKEN_LIFESPAN
    );
    this.maxRefreshTokenLifespan = resolvePositiveInteger(
      strapi,
      'server.mcp.oauth.maxRefreshTokenLifespan',
      DEFAULT_MAX_REFRESH_TOKEN_LIFESPAN
    );
    this.authorizationCodeLifespan = resolvePositiveInteger(
      strapi,
      'server.mcp.oauth.authorizationCodeLifespan',
      DEFAULT_AUTHORIZATION_CODE_LIFESPAN
    );
    this.consentTicketLifespan = resolvePositiveInteger(
      strapi,
      'server.mcp.oauth.consentTicketLifespan',
      DEFAULT_CONSENT_TICKET_LIFESPAN
    );
  }

  isEnabled(): boolean {
    return this.#strapi.config.get<boolean>('server.mcp.oauth.enabled', false) === true;
  }

  isDynamicClientRegistrationEnabled(): boolean {
    return (
      this.#strapi.config.get<boolean>('server.mcp.oauth.dynamicClientRegistration', true) !== false
    );
  }

  /**
   * Overrides for the registration endpoint's rate limit (koa2-ratelimit options such as
   * `max`, `interval`, or `enabled: false`). The default of 5 requests per 5 minutes per IP
   * is too strict behind a shared egress (a team connecting from claude.ai at once) and the
   * right setting depends on the deployment's proxy topology.
   */
  getRegistrationRateLimitConfig(): Record<string, unknown> {
    const value = this.#strapi.config.get<unknown>('server.mcp.oauth.registrationRateLimit');

    return typeof value === 'object' && value !== null && !Array.isArray(value)
      ? (value as Record<string, unknown>)
      : {};
  }

  /**
   * True when `server.url` is configured. Without it every advertised OAuth URL falls back
   * to the host-port guess, which is wrong behind any proxy or public domain.
   */
  hasConfiguredServerUrl(): boolean {
    const url = this.#strapi.config.get<unknown>('server.url');

    return typeof url === 'string' && url.trim() !== '';
  }

  /**
   * RFC 8414 issuer identifier: the server's public base URL.
   */
  get issuer(): string {
    return trimTrailingSlashes(
      this.#strapi.config.get<string>('server.absoluteUrl', 'http://localhost:1337')
    );
  }

  /**
   * RFC 8707 / RFC 9728 resource identifier of the MCP endpoint.
   */
  get resource(): string {
    return `${this.issuer}${this.#mcpPath}`;
  }

  get protectedResourceMetadataUrl(): string {
    return `${this.issuer}${OAUTH_PATHS.protectedResourceMetadata}${this.#mcpPath}`;
  }

  get authorizationEndpoint(): string {
    return `${this.issuer}${OAUTH_PATHS.authorize}`;
  }

  get tokenEndpoint(): string {
    return `${this.issuer}${OAUTH_PATHS.token}`;
  }

  get registrationEndpoint(): string {
    return `${this.issuer}${OAUTH_PATHS.register}`;
  }

  get revocationEndpoint(): string {
    return `${this.issuer}${OAUTH_PATHS.revoke}`;
  }

  /**
   * URL of the consent page inside the admin panel.
   */
  get consentPageUrl(): string {
    const adminUrl = trimTrailingSlashes(
      this.#strapi.config.get<string>('admin.absoluteUrl', `${this.issuer}/admin`)
    );

    return `${adminUrl}${CONSENT_PAGE_PATH}`;
  }

  /**
   * Secret used to sign MCP session JWTs and consent tickets. Derived from the admin auth
   * secret so MCP tokens are never interchangeable with admin panel tokens, even before the
   * session origin check.
   */
  getJwtSecret(): string {
    const adminSecret = this.#strapi.config.get<string>('admin.auth.secret');

    if (!adminSecret) {
      throw new Error(
        '[MCP] Missing admin.auth.secret. A secret is required to enable MCP OAuth authentication.'
      );
    }

    return createHmac('sha256', adminSecret).update('strapi-mcp-oauth').digest('hex');
  }
}
