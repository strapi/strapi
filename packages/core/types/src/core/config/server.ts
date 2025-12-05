export interface App {
  keys: string[];
}

export interface Cron {
  enabled?: boolean | undefined;
  tasks?: object | undefined;
}

export interface Dirs {
  public?: string | undefined;
}

export interface Logger {
  updates?:
    | {
        enabled?: boolean | undefined;
      }
    | undefined;
  startup?:
    | {
        enabled?: boolean | undefined;
      }
    | undefined;
}

export interface ServerTransfer {
  remote?:
    | {
        enabled?: boolean | undefined;
      }
    | undefined;
}

export interface ServerAdmin {
  autoOpen?: boolean | undefined;
}

export interface Proxy {
  global?: string | undefined;
  http?: string | undefined;
  https?: string | undefined;
  fetch?: string | undefined;
}

export interface Webhooks {
  populateRelations?: boolean | undefined;
  [key: string]: unknown;
}

export interface Http {
  serverOptions?:
    | {
        requestTimeout?: number | undefined;
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
  socket?: string | number | undefined;
  emitErrors?: boolean | undefined;
  url?: string | undefined;
  absoluteUrl?: string | undefined;
  proxy?: boolean | Proxy | undefined;
  globalProxy?: string | undefined;
  cron?: Cron | undefined;
  dirs?: Dirs | undefined;
  logger?: Logger | undefined;
  transfer?: ServerTransfer | undefined;
  admin?: ServerAdmin | undefined;
  webhooks?: Webhooks | undefined;
  http?: Http | undefined;
}
