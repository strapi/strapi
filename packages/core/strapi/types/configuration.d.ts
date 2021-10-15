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
export interface StrapiAdminConfig {}

export interface StrapiConfig {
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
}
