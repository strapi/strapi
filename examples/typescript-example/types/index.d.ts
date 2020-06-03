import Strapi from 'strapi';

declare global {
  namespace NodeJS {
    export interface Global {
      strapi: typeof Strapi;
    }
  }
}
