import { Config } from './config';
import { Routes } from './routes';
import { ContentTypes } from './content-types';
import { Controllers } from './controllers';
import { Register, Bootstrap, Destroy } from './lifecycle';

export interface ServerObject {
  register: Register;
  bootstrap: Bootstrap;
  destroy: Destroy;
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

export type ServerFunction = () => ServerObject;

// Interface for the plugin strapi-server file
export type Server = ServerObject | ServerFunction;
