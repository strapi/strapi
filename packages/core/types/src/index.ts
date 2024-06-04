import { Strapi } from './core';

export type * as Core from './core';
export type * as Data from './data';
export type * as Internal from './internal';
export type * as Modules from './modules';
export type * as Plugin from './plugin';
export type * as Public from './public';
export type * as Schema from './schema';
export type * as Utils from './utils';
export type * as Struct from './struct';
export type * as UID from './uid';

declare global {
  // eslint-disable-next-line vars-on-top,no-var
  var strapi: Strapi;

  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      strapi: Strapi;
    }
  }
}
