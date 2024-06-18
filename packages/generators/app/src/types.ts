export type PackageManager = 'npm' | 'yarn' | 'pnpm';

export interface Scope {
  name?: string;
  rootPath: string;
  template?: string;
  strapiVersion: string;
  installDependencies?: boolean;
  devDependencies: Record<string, string>;
  dependencies: Record<string, string>;
  docker: boolean;
  packageManager: PackageManager;
  runApp: boolean;
  isQuickstart?: boolean;
  uuid?: string;
  deviceId?: string;
  database: DatabaseInfo;
  tmpPath: string;
  packageJsonStrapi: Record<string, unknown>;
  useTypescript: boolean;
  useExampleApp: boolean;
}

export interface Options {
  directory: string;

  packageManager: PackageManager;

  runApp?: boolean;
  template?: string;

  isQuickstart?: boolean;

  useTypescript: boolean;
  useExampleApp: boolean;

  database: {
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
  };
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
