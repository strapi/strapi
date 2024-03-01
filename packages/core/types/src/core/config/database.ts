import type { If, StrictEqual } from '../../utils';

type ClientKind = 'mysql' | 'postgres' | 'sqlite';

type IfClientIs<TClient extends ClientKind, TClientKind extends ClientKind, TOnTrue, TOnFalse> = If<
  StrictEqual<TClient, TClientKind>,
  TOnTrue,
  TOnFalse
>;

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
  afterCreate?: (conn: unknown, done: (err?: Error, conn?: unknown) => void) => void;
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
} & { [key: string]: unknown } & IfClientIs<TClient, 'postgres', { schema?: string }, unknown>;

type SqliteConnection = {
  filename: string;
} & { [key: string]: unknown };

export interface Database<TClient extends ClientKind> {
  connection: {
    client: TClient;
    connection: IfClientIs<TClient, 'sqlite', SqliteConnection, Connection<TClient>>;
    debug?: boolean;
    pool?: PoolConfig;
    acquireConnectionTimeout?: number;
  } & { [key: string]: unknown } & IfClientIs<
      TClient,
      'sqlite',
      { useNullAsDefault?: boolean },
      unknown
    >;
  settings?: {
    forceMigration?: boolean;
    runMigrations?: boolean;
  };
}
