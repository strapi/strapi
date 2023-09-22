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

export interface WebhooksProp {
  populateRelations?: boolean;
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
  proxy?: boolean;
  globalProxy?: string;
  cron?: CronProp;
  dirs?: DirsProp;
  webhooks?: WebhooksProp;
}
