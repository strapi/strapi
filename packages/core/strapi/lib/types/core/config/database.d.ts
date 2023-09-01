import { Utils } from '../..';

type ClientKind = 'mysql' | 'postgres' | 'sqlite';

type SSLConfig = {
  rejectUnauthorized?: boolean;
  key?: string;
  cert?: string;
  ca?: string;
  capath?: string;
  cipher?: string;
};

type PoolConfig = {
  min?: number;
  max?: number;
  acquireTimeoutMillis?: number;
  createTimeoutMillis?: number;
  destroyTimeoutMillis?: number;
  idleTimeoutMillis?: number;
  reapIntervalMillis?: number;
  createRetryIntervalMillis?: number;
  // Todo: add types for these callbacks
  afterCreate?: (conn: any, done: (err?: Error, conn?: any) => void) => void;
};

type Connection<TClient extends ClientKind> = {
  database: string;
  user: string;
  password: string;
  port: number;
  host: string;
  ssl?: SSLConfig | boolean;
  connectionString?: string;
  timezone?: string;
} & { [key: string]: unknown } & Utils.Expression.MatchFirst<
    [[Utils.Expression.StrictEqual<TClient, 'postgres'>, { schema?: string }]],
    unknown
  >;

type SqliteConnection = {
  filename: string;
} & { [key: string]: unknown };

export interface DBConfig<TClient extends ClientKind> {
  connection: {
    client: TClient;
    connection: Utils.Expression.If<
      Utils.Expression.StrictEqual<TClient, 'sqlite'>,
      SqliteConnection,
      Connection<TClient>
    >;
    debug?: boolean;
    pool?: PoolConfig;
    acquireConnectionTimeout?: number;
  } & { [key: string]: unknown } & Utils.Expression.MatchFirst<
      [[Utils.Expression.StrictEqual<TClient, 'sqlite'>, { useNullAsDefault?: boolean }]],
      unknown
    >;
  settings?: {
    forceMigration?: boolean;
    runMigrations?: boolean;
  };
}
