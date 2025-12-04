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
  updates?: {
    enabled?: boolean;
  };
  startup?: {
    enabled?: boolean;
  };
}

export interface ServerTransfer {
  remote?: {
    enabled?: boolean;
  };
}

export interface ServerAdmin {
  autoOpen?: boolean;
}

export interface Proxy {
  global?: string;
  http?: string;
  https?: string;
  fetch?: string;
}

export interface Webhooks {
  populateRelations?: boolean;
  [key: string]: any;
}

export interface Http {
  serverOptions?: {
    requestTimeout?: number;
    [key: string]: any;
  };
  [key: string]: any;
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
