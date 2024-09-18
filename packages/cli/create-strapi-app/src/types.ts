export interface Options {
  useNpm?: boolean;
  usePnpm?: boolean;
  useYarn?: boolean;
  quickstart?: boolean;
  run?: boolean;
  dbclient?: DBClient;
  skipCloud?: boolean;
  skipDb?: boolean;
  dbhost?: string;
  dbport?: string;
  dbname?: string;
  dbusername?: string;
  dbpassword?: string;
  dbssl?: string;
  dbfile?: string;
  template?: string;
  typescript?: boolean;
  javascript?: boolean;
  install?: boolean;
  example?: boolean;
  gitInit?: boolean;
  templateBranch?: string;
  templatePath?: string;
}

export type DBClient = 'mysql' | 'postgres' | 'sqlite';

export type DBConfig = {
  client: DBClient;
  connection: {
    host?: string;
    port?: string;
    database?: string;
    username?: string;
    password?: string;
    filename?: string;
    ssl?: boolean;
  };
};

export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export interface Scope {
  name: string;
  rootPath: string;
  template?: string;
  templateBranch?: string;
  templatePath?: string;
  strapiVersion?: string;
  installDependencies?: boolean;
  devDependencies?: Record<string, string>;
  dependencies?: Record<string, string>;
  docker?: boolean;
  packageManager: PackageManager;
  runApp?: boolean;
  isQuickstart?: boolean;
  uuid?: string;
  deviceId?: string;
  database: DatabaseInfo;
  tmpPath?: string;
  packageJsonStrapi?: Record<string, unknown>;
  useTypescript?: boolean;
  useExample?: boolean;
  gitInit?: boolean;
}

export type ClientName = 'mysql' | 'postgres' | 'sqlite';

export interface DatabaseInfo {
  client: ClientName;
  connection?: {
    host?: string;
    port?: string;
    database?: string;
    username?: string;
    password?: string;
    filename?: string;
    ssl?: boolean;
  };
}

export interface StderrError extends Error {
  stderr: string;
}

export function isStderrError(error: unknown): error is StderrError {
  return (
    typeof error === 'object' &&
    error !== null &&
    'stderr' in error &&
    typeof error.stderr === 'string'
  );
}
