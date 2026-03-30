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
        /**
         * Max batch size for remote transfer WebSocket batches; negotiated with the initiator as the
         * minimum of both sides’ values. Unit and behavior are documented in user docs — not a hard RSS cap.
         */
        maxBatchSize?: number;
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
}
