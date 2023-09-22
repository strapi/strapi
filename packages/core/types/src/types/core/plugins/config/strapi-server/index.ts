import type { Config } from './config';
import type { Routes } from './routes';
import type { ContentTypes } from './content-types';
import type { Controllers } from './controllers';
import type { Register, Bootstrap, Destroy } from './lifecycle';

// Users can access, for example, ServerObject['register'] if they need the type used for that property
export interface ServerObject {
  register: Register;
  bootstrap: Bootstrap;
  destroy: Destroy;
  config: Config;
  routes: Routes;
  contentTypes: ContentTypes;
  controllers: Controllers;
  // TODO
  registerTrads: unknown;
  services: unknown;
  policies: unknown;
  middlewares: unknown;
}

export type ServerFunction = () => ServerObject;

// Interface for the plugin strapi-server file
export type ServerInput = ServerObject | ServerFunction;
