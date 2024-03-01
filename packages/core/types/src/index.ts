export type * as Core from './core';
export type * as Data from './data';
export type * as Internal from './internal';
export type * as Modules from './modules';
export type * as Plugin from './plugin';
export type * as Public from './public';
export type * as Schema from './schema';
export type * as Utils from './utils';

import type { LoadedStrapi } from './core';

declare global {
  var strapi: LoadedStrapi;
  namespace NodeJS {
    interface Global {
      strapi: LoadedStrapi;
    }
  }
}
