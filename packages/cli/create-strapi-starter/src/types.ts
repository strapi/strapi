import type { Options as GenerateNewAppOptions } from '@strapi/generate-new';

export interface PackageInfo {
  name: string;
  version: string;
}

export interface Options {
  useNpm?: boolean;
  usePnpm?: boolean;
  useYarn?: boolean;
  quickstart?: boolean;
  dbclient?: 'mysql' | 'postgres' | 'sqlite';
  dbhost?: string;
  dbport?: string;
  dbname?: string;
  dbusername?: string;
  dbpassword?: string;
  dbssl?: string;
  dbfile?: string;
  typescript?: boolean;
  javascript?: boolean;
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

export type StarterOptions = GenerateNewAppOptions & {
  starter: string;
};

export type PackageManager = GenerateNewAppOptions['packageManager'];
