import { LoggerOptions } from 'winston';

export interface StrapiConfigContext {
  env: (<T = string>(key: string, initial?: T) => T) & {
    int: (key: string, initial?: number) => number;
    float: (key: string, initial?: number) => number;
    bool: (key: string, initial?: boolean) => boolean;
    json: (key: string, initial?: any) => any;
    array: (key: string, initial?: any[]) => any[];
    date: (key: string, initial?: Date) => Date;
  };
}

export interface StrapiServerConfig {
  url: string;
  host: string;
  port: number;
  proxy: boolean;
  cron: {
    enabled: boolean;
  };
  admin: {
    autoOpen: boolean;
  };
}
export interface StrapiAdminConfig {
  url?: string;
  path?: string;
}

export interface StrapiMiddlewareSettings {}
export interface StrapiMiddlewareConfig {
  settings: StrapiMiddlewareSettings;
}

export interface StrapiConfig {
  host: string;
  port: number;
  logger: LoggerOptions;
  middleware: StrapiMiddlewareConfig;
  uuid: string;
  installedPlugins: string[];
  installedProviders: string[];
  autoReload: boolean;
  serveAdminPanel: boolean;
  launchedAt: number;
  appPath: string;
  paths: {
    config: string;
    static: string;
    views: string;
  };
  environment: string;
  uuid: string;
  packageJsonStrapi: Record<string, any>;
  functions: Record<string, any>;
  server: StrapiServerConfig;
  admin: StrapiAdminConfig;
  info: {
    name: string;
    strapi: string;
    dependencies: Record<string, any>;
  };
}
