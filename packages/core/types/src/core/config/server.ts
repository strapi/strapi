import type { OpenAPI } from './openapi';

export interface App {
  keys: string[];
}

export interface Cron {
  enabled?: boolean;
  tasks?: object;
}

export interface Dirs {
  public?: string;
}

export interface Logger {
  updates?:
    | {
        enabled?: boolean;
      }
    | undefined;
  startup?:
    | {
        enabled?: boolean;
      }
    | undefined;
}

export interface ServerTransfer {
  remote?:
    | {
        enabled?: boolean;
        /**
         * Max milliseconds without forward progress while pulling assets from a remote instance
         * (`strapi transfer --from …`). Maps to the remote source provider stall timeout.
         * Omit to use the package default (typically several minutes for large files over JSON/WS).
         */
        assetIdleTimeoutMs?: number;
      }
    | undefined;
}

export interface ServerAdmin {
  autoOpen?: boolean;
}

export interface Proxy {
  global?: string;
  http?: string;
  https?: string;
  fetch?: string;
  koa?: boolean;
}

export interface Webhooks {
  populateRelations?: boolean;
  /**
   * Interval, in milliseconds, at which each instance reloads the in-memory
   * webhook registry from the database so configuration changes propagate
   * across a clustered deployment. Disabled when unset or `0`.
   */
  reloadInterval?: number;
  [key: string]: unknown;
}

export interface Http {
  serverOptions?:
    | {
        requestTimeout?: number;
        [key: string]: unknown;
      }
    | undefined;
  [key: string]: unknown;
}

export interface McpConfig {
  enabled: boolean;
  /** Maximum time (ms) to wait for the MCP transport connection. Defaults to 5 000. */
  connectTimeoutMs?: number;
  /** Maximum time (ms) to wait for a single MCP request to complete. Defaults to 60 000. */
  requestTimeoutMs?: number;
}

export interface Server {
  // required
  host: string;
  port: number;
  app: App;

  // optional
  socket?: string | number;
  emitErrors?: boolean;
  url?: string;
  absoluteUrl?: string;
  proxy?: boolean | Proxy;
  globalProxy?: string;
  cron?: Cron;
  dirs?: Dirs;
  logger?: Logger;
  transfer?: ServerTransfer;
  admin?: ServerAdmin;
  openapi?: OpenAPI;
  webhooks?: Webhooks;
  http?: Http;
  mcp?: McpConfig;
}
