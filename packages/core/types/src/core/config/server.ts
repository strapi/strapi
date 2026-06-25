import type { OpenAPI } from './openapi';
import type { CronTasks } from '../../modules/cron';

export interface App {
  keys: string[];
}

export interface Cron {
  enabled?: boolean;
  tasks?: CronTasks;
}

export interface Dirs {
  public?: string;
}

export interface LoggerConfig {
  level?: string;
  [key: string]: unknown;
}

export interface Logger {
  /**
   * Winston logger options merged into the Strapi logger at startup.
   */
  config?: LoggerConfig;
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
  /**
   * @deprecated Use `admin.autoOpen` in `config/admin.ts` instead.
   */
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
  enabled?: boolean;
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
  /**
   * @deprecated Not read by Strapi. Reserved for backward compatibility in config files.
   */
  emitErrors?: boolean;
  url?: string;
  absoluteUrl?: string;
  proxy?: boolean | Proxy;
  /**
   * @deprecated Use `server.proxy.global` instead.
   */
  globalProxy?: string;
  cron?: Cron;
  dirs?: Dirs;
  logger?: Logger;
  transfer?: ServerTransfer;
  /**
   * @deprecated Use `admin.autoOpen` in `config/admin.ts` instead.
   */
  admin?: ServerAdmin;
  openapi?: OpenAPI;
  webhooks?: Webhooks;
  http?: Http;
  mcp?: McpConfig;
}
