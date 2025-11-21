export interface AppProp {
  keys: string[];
}

export interface CronProp {
  enabled?: boolean;
  tasks?: object;
}

export interface DirsProp {
  public?: string;
}

export interface LoggerProp {
  updates?: {
    enabled?: boolean;
  };
  startup?: {
    enabled?: boolean;
  };
}

export interface TransferProp {
  remote?: {
    enabled?: boolean;
  };
}

export interface AdminProp {
  autoOpen?: boolean;
}

export interface ProxyProp {
  global?: string;
  http?: string;
  https?: string;
  fetch?: string;
}

export interface WebhooksProp {
  populateRelations?: boolean;
  [key: string]: any;
}

export interface HttpProp {
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
  app: AppProp;

  // optional
  socket?: string | number;
  emitErrors?: boolean;
  url?: string;
  absoluteUrl?: string;
  proxy?: boolean | ProxyProp;
  globalProxy?: string;
  cron?: CronProp;
  dirs?: DirsProp;
  logger?: LoggerProp;
  transfer?: TransferProp;
  admin?: AdminProp;
  webhooks?: WebhooksProp;
  http?: HttpProp;
}
