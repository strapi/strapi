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
   * @deprecated Use `admin.autoOpen` in `config/admin.ts` instead. Ignored at runtime; a startup warning is logged if set.
   */
  autoOpen?: boolean;
}

export interface Proxy {
  global?: string;
  http?: string;
  https?: string;
  fetch?: string;
  koa?: boolean;
  ipHeader?: string;
  maxIpsCount?: number;
}

export interface Webhooks {
  populateRelations?: boolean;
  deduplicateReleaseWebhooks?: boolean;
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

export interface McpOAuthConfig {
  /** Enables the OAuth 2.1 authorization server for MCP clients. Defaults to false. */
  enabled?: boolean;
  /** Allows MCP clients to self-register (RFC 7591). Defaults to true. */
  dynamicClientRegistration?: boolean;
  /** Access token lifespan in seconds. Defaults to 1 800 (30 minutes). */
  accessTokenLifespan?: number;
  /** Idle refresh token lifespan in seconds. Defaults to 1 209 600 (14 days). */
  idleRefreshTokenLifespan?: number;
  /** Maximum refresh token lifespan in seconds. Defaults to 2 592 000 (30 days). */
  maxRefreshTokenLifespan?: number;
  /** Authorization code lifespan in seconds. Defaults to 120. */
  authorizationCodeLifespan?: number;
  /** Consent ticket lifespan in seconds. Defaults to 300. */
  consentTicketLifespan?: number;
  /**
   * Overrides for the registration endpoint's rate limit (koa2-ratelimit options such as
   * `max`, `interval` or `enabled`). Defaults to 5 requests per 5 minutes per IP.
   */
  registrationRateLimit?: {
    enabled?: boolean;
    max?: number;
    interval?: number | { min?: number; sec?: number; hour?: number; day?: number };
  };
}

export interface McpConfig {
  enabled?: boolean;
  /** Maximum time (ms) to wait for the MCP transport connection. Defaults to 5 000. */
  connectTimeoutMs?: number;
  /** Maximum time (ms) to wait for a single MCP request to complete. Defaults to 60 000. */
  requestTimeoutMs?: number;
  /**
   * Maximum array elements and object keys combined in one tool call's arguments.
   * Must be an integer >= 1. Set to `Infinity` to disable (JS/TS config only). Defaults to 10 000.
   */
  maxToolInputElements?: number;
  /** OAuth 2.1 authentication for MCP clients. */
  oauth?: McpOAuthConfig;
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
   * @deprecated Use `server.proxy.global` instead. Ignored at runtime; a startup warning is logged if set.
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
