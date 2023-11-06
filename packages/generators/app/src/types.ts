export interface Scope {
  name?: string;
  rootPath: string;
  template?: string;
  strapiVersion: string;
  strapiDependencies: Array<string>;
  installDependencies?: boolean;
  additionalsDependencies: Record<string, string>;
  docker: boolean;
  useYarn: boolean;
  useTypescript: boolean;
  runQuickstartApp: boolean;
  quick?: boolean;
  uuid?: string;
  deviceId?: string;
  dbforce?: boolean;
  database?: DatabaseInfo;
  debug?: boolean;
  tmpPath: string;
  packageJsonStrapi: Record<string, unknown>;
}

export interface NewOptions {
  useNpm: boolean;
  run: boolean;
  debug: boolean;
  quickstart: boolean;
  template: string;
  starter: string;
  typescript: boolean;
  dbforce: boolean;
  dbssl: string;
  dbclient: string;
  dbhost: string;
  dbport: string;
  dbname: string;
  dbusername: string;
  dbpassword: string;
  dbfile: string;
}

export interface Configuration {
  client: string;
  connection: DatabaseInfo;
  dependencies: Record<string, string>;
}

export type ClientName = 'mysql' | 'mysql2' | 'postgres' | 'sqlite' | 'sqlite-legacy';

export interface DatabaseInfo {
  client?: string;
  connection: {
    host?: string;
    port?: string;
    database?: string;
    username?: string;
    password?: string;
    filename?: string;
    ssl?: boolean;
  };
  useNullAsDefault?: boolean;
}

export interface PackageInfo {
  name: string;
  version: string;
}

export interface TemplateConfig {
  package: Record<string, unknown>;
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
