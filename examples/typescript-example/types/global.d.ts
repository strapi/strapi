import Strapi from 'strapi';

declare global {
  namespace NodeJS {
    interface Global {
      strapi: typeof Strapi;
    }
  }
}
