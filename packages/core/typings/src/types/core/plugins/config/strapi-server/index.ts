import { Config } from './config';
import { Routes } from './routes';
import { ContentTypes } from './content-types';
import { Controllers } from './controllers';
import { Register, Bootstrap, Destroy } from './lifecycle';
import { LoadedStrapi } from '../../../../..';

export interface ServerObject<TStrapi> {
  register: Register<TStrapi>;
  bootstrap: Bootstrap<TStrapi>;
  destroy: Destroy<TStrapi>;
  config: Config;
  routes: Routes;
  contentTypes: ContentTypes;
  controllers: Controllers;
  // TODO
  registerTrads: any;
  services: any;
  policies: any;
  middlewares: any;
}

export type ServerFunction<TStrapi> = () => ServerObject<TStrapi>;

// Interface for the plugin strapi-server file
export type Server<TStrapi = LoadedStrapi> = ServerObject<TStrapi> | ServerFunction<TStrapi>;
