// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace Database {
  export type ClientKind = 'mysql' | 'postgres' | 'sqlite';
}

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

type SharedConnection = {
  database: string;
  user: string;
  password: string;
  port: number;
  host: string;
  ssl?: SSLConfig | boolean;
  connectionString?: string;
  timezone?: string;
};

type Connection<TClient extends Database.ClientKind> = {
  mysql: SharedConnection;
  postgres: SharedConnection & { schema?: string };
  sqlite: { filename: string };
}[TClient] & { [key: string]: unknown };

type SharedDatabaseConnection<TClient extends Database.ClientKind> = {
  client: TClient;
  connection:
    | Connection<TClient>
    | (() => Promise<Connection<TClient>>)
    | (() => Connection<TClient>);
  debug?: boolean;
  pool?: PoolConfig;
  acquireConnectionTimeout?: number;
};

type DatabaseConnection<TClient extends Database.ClientKind> = {
  mysql: SharedDatabaseConnection<'mysql'>;
  postgres: SharedDatabaseConnection<'postgres'>;
  sqlite: SharedDatabaseConnection<'sqlite'> & { useNullAsDefault?: boolean };
}[TClient] & { [key: string]: unknown };

export interface Database<TClient extends Database.ClientKind = Database.ClientKind> {
  connection: DatabaseConnection<TClient>;
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
    /** Flush interval for artifact batches (ms). */
    flushIntervalMs?: number;
    /** Max buffered perf rows before each flush (rolling window). */
    maxEvents?: number;
    /**
     * When set to a positive byte size, the performance JSON Lines file is renamed to
     * `{artifactPath}.rotated.{timestamp}.jsonl` before the next append once the file reaches this size.
     * `0` (default) disables rotation (operators can still rotate logs externally).
     */
    artifactMaxFileBytes?: number;
  };
}
