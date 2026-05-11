import type { If, StrictEqual } from '../../utils';

export type ClientKind = 'mysql' | 'postgres' | 'sqlite';

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

export interface Database<TClient extends ClientKind = ClientKind> {
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
    useTypescriptMigrations?: boolean;
  };
  performance?: {
    enabled?: boolean;
    slowQueryMs?: number;
    sampleRate?: number;
    captureSqlText?: boolean;
    captureBindings?: boolean;
    output?: 'none' | 'log' | 'artifact' | 'both';
    /** Append-only JSON Lines artifact path (used when `output` is `artifact` or `both`) */
    artifactPath?: string;
    /** Flush interval for artifact batches (ms). Preferred over {@link artifactFlushIntervalMs}. */
    flushIntervalMs?: number;
    /** Max buffered perf rows before each flush (rolling window). Preferred over {@link artifactMaxEvents}. */
    maxEvents?: number;
    /** @deprecated Use {@link flushIntervalMs}. */
    artifactFlushIntervalMs?: number;
    /** @deprecated Use {@link maxEvents}. */
    artifactMaxEvents?: number;
  };
}
