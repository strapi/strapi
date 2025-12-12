import type { If, StrictEqual } from '../../utils';

type ClientKind = 'mysql' | 'postgres' | 'sqlite';

type IfClientIs<TClient extends ClientKind, TClientKind extends ClientKind, TOnTrue, TOnFalse> = If<
  StrictEqual<TClient, TClientKind>,
  TOnTrue,
  TOnFalse
>;

type SSLConfig = {
  rejectUnauthorized?: boolean | undefined;
  key?: string | undefined;
  cert?: string | undefined;
  ca?: string | undefined;
  capath?: string | undefined;
  cipher?: string | undefined;
};

type PoolConfig = {
  min?: number | undefined;
  max?: number | undefined;
  acquireTimeoutMillis?: number | undefined;
  createTimeoutMillis?: number | undefined;
  destroyTimeoutMillis?: number | undefined;
  idleTimeoutMillis?: number | undefined;
  reapIntervalMillis?: number | undefined;
  createRetryIntervalMillis?: number | undefined;
  // Todo: add types for these callbacks
  afterCreate?: (conn: unknown, done: (err?: Error, conn?: unknown) => void) => void | undefined;
};

type Connection<TClient extends ClientKind> = {
  database: string;
  user: string;
  password: string;
  port: number;
  host: string;
  ssl?: SSLConfig | boolean | undefined;
  connectionString?: string | undefined;
  timezone?: string | undefined;
} & { [key: string]: unknown } & IfClientIs<TClient, 'postgres', { schema?: string }, unknown>;

type SqliteConnection = {
  filename: string;
} & { [key: string]: unknown };

export interface Database<TClient extends ClientKind> {
  connection: {
    client: TClient;
    connection: IfClientIs<TClient, 'sqlite', SqliteConnection, Connection<TClient>>;
    debug?: boolean | undefined;
    pool?: PoolConfig | undefined;
    acquireConnectionTimeout?: number | undefined;
  } & { [key: string]: unknown } & IfClientIs<
      TClient,
      'sqlite',
      { useNullAsDefault?: boolean | undefined },
      unknown
    >;
  settings?: {
    forceMigration?: boolean | undefined;
    runMigrations?: boolean | undefined;
    useTypescriptMigrations?: boolean | undefined;
  };
}
