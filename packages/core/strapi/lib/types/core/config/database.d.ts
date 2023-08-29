import { Utils } from '../..';

type Client = 'mysql' | 'postgres' | 'sqlite';

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

type Connection<TClient extends Client> = {
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
    {}
  >;

type SqliteConnection = {
  filename: string;
} & { [key: string]: unknown };

export interface DBConfig<TClient extends Client> {
  connection: {
    client: TClient;
    connection: Utils.Expression.MatchFirst<
      [[Utils.Expression.StrictEqual<TClient, 'sqlite'>, SqliteConnection]],
      Connection<TClient>
    >;
    debug?: boolean;
    pool?: PoolConfig;
    acquireConnectionTimeout?: number;
  } & { [key: string]: unknown } & Utils.Expression.MatchFirst<
      [[Utils.Expression.StrictEqual<TClient, 'sqlite'>, { useNullAsDefault?: boolean }]],
      {}
    >;
  settings?: {
    forceMigration?: boolean;
    runMigrations?: boolean;
  };
}
