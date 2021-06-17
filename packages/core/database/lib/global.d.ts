import type { Database } from '@strapi/database';

declare global {
  interface Strapi {
    query: Database['query'];
  }

  export interface Global {
    strapi: Strapi;
  }

  const strapi: Strapi;
}

export {};
