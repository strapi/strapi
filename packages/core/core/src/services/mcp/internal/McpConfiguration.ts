import type { Core } from '@strapi/types';

export const DEFAULT_MAX_TOOL_INPUT_ELEMENTS = 10_000;

// The SDK throws on any value that is not a number >= 1, so only a valid value may reach it.
const resolveMaxToolInputElements = (strapi: Core.Strapi): number => {
  const raw = strapi.config.get<unknown>('server.mcp.maxToolInputElements');

  if (raw === undefined) {
    return DEFAULT_MAX_TOOL_INPUT_ELEMENTS;
  }

  // env() returns strings
  const value = typeof raw === 'string' && raw.trim() !== '' ? Number(raw) : raw;

  if (value === Infinity || (Number.isInteger(value) && (value as number) >= 1)) {
    return value as number;
  }

  strapi.log.warn(
    `[MCP] Invalid server.mcp.maxToolInputElements (${String(raw)}). ` +
      `Expected an integer >= 1 or Infinity. Using ${DEFAULT_MAX_TOOL_INPUT_ELEMENTS}.`
  );

  return DEFAULT_MAX_TOOL_INPUT_ELEMENTS;
};

export class McpConfiguration {
  readonly path: string;

  readonly connectTimeoutMs: number;

  readonly requestTimeoutMs: number;

  readonly maxToolInputElements: number;

  #strapi: Core.Strapi;

  constructor(strapi: Core.Strapi) {
    this.#strapi = strapi;
    this.path = '/mcp';
    this.connectTimeoutMs = strapi.config.get('server.mcp.connectTimeoutMs', 5 * 1000); // 5 seconds
    this.requestTimeoutMs = strapi.config.get('server.mcp.requestTimeoutMs', 60 * 1000); // 60 seconds
    this.maxToolInputElements = resolveMaxToolInputElements(strapi);
  }

  isEnabled(): boolean {
    return this.#strapi.config.get<boolean>('server.mcp.enabled', false) === true;
  }

  isDevMode(): boolean {
    return this.#strapi.config.get('autoReload', false);
  }
}
