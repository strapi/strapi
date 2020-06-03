declare namespace Strapi {
  import type http from 'http';
  import type https from 'https';
  import { DatabaseManager, Repository } from 'strapi-database';
  import { Application, Context } from 'koa';
  import { Logger } from 'pino';

  export interface HandlerCollectionBase<THandler> {
    [collectionName: string]: {
      [handlerName: string]: THandler;
    }
  }

  type ControllerCollection = HandlerCollectionBase<(ctx: Context) => Promise<any>>;
  type ServiceCollection = HandlerCollectionBase<(...args: Array<any>) => any>;

  interface Route {
    method: string;
    path: string;
    handler: string;
    config: {
      policies: Array<string>;
    }
  }

  interface Config {
    [key: string]: any;
    routes: Array<Route>;
  }

  export namespace Plugins {
    export type BaseServiceType = Strapi.ICollection<Strapi.IService>;

    export interface PluginBase<TServices extends BaseServiceType> {
      models: Strapi.ICollection<Strapi.IModel>;
      services: TServices;
    }

    export interface UsersPermissionsServices extends BaseServiceType {
      jwt: {
        verify(access_token: string): Promise<{}>;
      }
    }

    export interface UsersPermissionsPlugin extends PluginBase<UsersPermissionsServices> {
      controllers: {
        [name: string]: {
          [handlerName: string]: (ctx: Context) => Promise<any>;
        };
      }
    }
  }

  export function start(): void;
  export function stop(): void;
  export function reload(): void;
  export const log: Logger;
  export const app: Application;
  export const server: http.Server | https.Server;
  export const controllers: ControllerCollection;
  export const services: ServiceCollection;
  export const config: Config & {
    bootstrapTimeout: number;
  }
  export const api: {
    [apiName: string]: {
      controllers: ControllerCollection;
      services: ServiceCollection;
      configs: Config;
    }
  };
  export const plugins: {
    [name: string]: Strapi.Plugins.PluginBase<any>;
    'users-permissions': Plugins.UsersPermissionsPlugin;
  };
  export const db: DatabaseManager;
  export function query(model: string, plugin?: string): Repository;
}

declare function Strapi(opts?: {}): Strapi;

declare global {
  namespace NodeJS {
    interface Global {
      strapi: typeof Strapi;
    }
  }
}

export = Strapi;
