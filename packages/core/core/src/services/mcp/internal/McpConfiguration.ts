import type { Core } from '@strapi/types';

export class McpConfiguration {
  readonly path: string;

  readonly sessionIdleTimeoutMs: number;

  readonly maxSessions: number;

  readonly cleanupIntervalMs: number;

  readonly requestTimeoutMs: number;

  #strapi: Core.Strapi;

  constructor(strapi: Core.Strapi) {
    this.#strapi = strapi;
    this.path = '/mcp';
    this.sessionIdleTimeoutMs = strapi.config.get(
      'server.mcp.sessionIdleTimeoutMs',
      30 * 60 * 1000
    ); // 30 minutes
    this.maxSessions = strapi.config.get('server.mcp.maxSessions', 100);
    this.cleanupIntervalMs = strapi.config.get('server.mcp.cleanupIntervalMs', 5 * 60 * 1000); // 5 minutes
    this.requestTimeoutMs = strapi.config.get('server.mcp.requestTimeoutMs', 30 * 1000); // 30 seconds
  }

  isEnabled(): boolean {
    return (
      this.#strapi.config.get('server.mcp.enabled', false) &&
      // Only enabled in development mode until Auth is implemented
      this.#strapi.config.get('autoReload') === true
    );
  }

  isDevMode(): boolean {
    return this.#strapi.config.get('autoReload', false);
  }
}
