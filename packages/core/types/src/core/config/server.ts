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
   */
  requestSummaryEnabled?: boolean;
  /**
   * Spec name for the same behavior as {@link requestSummaryEnabled}; either flag enables tracking.
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

export interface ServerObservabilityTracingOtlp {
  /** When true and `url` is set, exports spans to an OTLP/HTTP traces endpoint (e.g. collector). */
  enabled?: boolean;
  /** OTLP traces endpoint URL, typically `http://localhost:4318/v1/traces`. */
  url?: string;
  /** Optional exporter headers (e.g. `{ Authorization: 'Bearer …' }`). */
  headers?: Record<string, string>;
}

export interface ServerObservabilityTracing {
  /**
   * Enables OpenTelemetry tracing in core: HTTP server spans and Knex query child spans.
   * Distinct from Strapi product telemetry and from `database.performance` query logging.
   */
  enabled?: boolean;
  /** Resource attribute `service.name`; defaults to `strapi`. */
  serviceName?: string;
  /**
   * Root sampling ratio in `[0, 1]`. `1` (default) keeps all traces; lower values randomly drop
   * new root spans (child spans still follow active context when a trace is sampled in).
   */
  sampleRate?: number;
  /** Log completed spans to the console (development / debugging only). */
  consoleExporter?: boolean;
  otlp?: ServerObservabilityTracingOtlp;
}

export interface ServerObservability {
  tracing?: ServerObservabilityTracing;
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
  webhooks?: Webhooks;
  http?: Http;
  performance?: ServerPerformance;
  observability?: ServerObservability;
}
