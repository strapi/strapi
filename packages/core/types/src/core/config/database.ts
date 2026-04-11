export type ClientKind = 'mysql' | 'postgres' | 'sqlite';

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

type Connection<TClient extends ClientKind> = {
  mysql: SharedConnection;
  postgres: SharedConnection & { schema?: string };
  sqlite: { filename: string };
}[TClient] & { [key: string]: unknown };

type SharedDatabaseConnection<TClient extends ClientKind> = {
  client: TClient;
  connection: Connection<TClient>;
  debug?: boolean;
  pool?: PoolConfig;
  acquireConnectionTimeout?: number;
};

type DatabaseConnection<TClient extends ClientKind> = {
  mysql: SharedDatabaseConnection<'mysql'>;
  postgres: SharedDatabaseConnection<'postgres'>;
  sqlite: SharedDatabaseConnection<'sqlite'> & { useNullAsDefault?: boolean };
}[TClient] & { [key: string]: unknown };

export interface Database<TClient extends ClientKind = ClientKind> {
  connection: DatabaseConnection<TClient>;
  settings?: {
    forceMigration?: boolean;
    runMigrations?: boolean;
    useTypescriptMigrations?: boolean;
  };
}
