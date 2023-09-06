/* eslint-disable vars-on-top */
/* eslint-disable no-var */
/* eslint-disable import/export */
import strapiFactory, { Strapi, LoadedStrapi } from './Strapi';
// import './modules';

export type * from './types';
export type * as EntityService from './services/entity-service';
export type * as factories from './factories';

declare global {
  var strapi: Strapi;
  namespace NodeJS {
    interface Global {
      strapi: Strapi;
    }
  }
}

export type { Strapi, LoadedStrapi };
export default strapiFactory;
