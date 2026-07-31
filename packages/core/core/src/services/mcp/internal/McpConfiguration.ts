import type { Core } from '@strapi/types';

export class McpConfiguration {
  readonly path: string;

  readonly connectTimeoutMs: number;

  readonly requestTimeoutMs: number;

  #strapi: Core.Strapi;

  constructor(strapi: Core.Strapi) {
    this.#strapi = strapi;
    this.path = '/mcp';
    this.connectTimeoutMs = strapi.config.get('server.mcp.connectTimeoutMs', 5 * 1000); // 5 seconds
    this.requestTimeoutMs = strapi.config.get('server.mcp.requestTimeoutMs', 60 * 1000); // 60 seconds
  }

  isEnabled(): boolean {
    return this.#strapi.config.get<boolean>('server.mcp.enabled', false) === true;
  }

  isDevMode(): boolean {
    return this.#strapi.config.get('autoReload', false);
  }
}
