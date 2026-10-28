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

export interface ServerPerformance {
  /**
   * When true, assigns a per-request id, aggregates DB query timings, and emits
   * `performance.request.summary` on the event hub when the HTTP response finishes.
   * See contributor docs: performance hub events.
   */
  requestTrackingEnabled?: boolean;
  /**
   * Requests slower than this (ms) always emit hub timeline events (`start`/`summary`/`stage`),
   * even when `requestSampleRate` would skip them.
   */
  slowRequestMs?: number;
  /**
   * Probability in `[0, 1]` that a request emits hub timeline events (when tracking is enabled).
   * Always combined with {@link slowRequestMs}: slow requests are never dropped from summaries.
   */
  requestSampleRate?: number;
  /**
   * When true with request tracking, records route-handler pipeline stage durations (`auth`, `policy`,
   * `middleware`, `controller`) and emits `performance.request.stage` with the summary batch.
   */
  emitStageEvents?: boolean;
}

export interface ServerObservabilityMetrics {
  /**
   * When true, records request, slow-query, and phase histograms/counters on the global
   * `@opentelemetry/api` meter. The app must register its own `MeterProvider` and exporter
   * before Strapi starts; otherwise the API no-ops. Independent of
   * {@link ServerObservabilityTracing.enabled}.
   */
  enabled?: boolean;
}

export interface ServerObservabilityTracing {
  /**
   * Enables OpenTelemetry spans in core (HTTP server, Knex queries, startup phases) through
   * `@opentelemetry/api`. Strapi does not register a tracer provider, sampler, propagator, or
   * exporter: the app owns the SDK. Distinct from Strapi product telemetry and from
   * `database.performance` query logging.
   */
  enabled?: boolean;
  /** When false, omit `strapi.http.route.*` stage spans (auth, policy, middleware, controller). */
  recordRouteHandlerStages?: boolean;
}

export interface ServerObservability {
  tracing?: ServerObservabilityTracing;
  metrics?: ServerObservabilityMetrics;
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
  performance?: ServerPerformance;
  observability?: ServerObservability;
  mcp?: McpConfig;
}
