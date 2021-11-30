import { Database } from '@strapi/database';
import { EntityService } from './services/entity-service';
import { Strapi as StrapiClass } from './Strapi';

export * as factories from './factories';
interface StrapiInterface extends StrapiClass {
  query: Database['query'];
  entityService: EntityService;
}

export type Strapi = StrapiInterface;

declare global {
  interface AllTypes {}
}

declare global {
  export interface Global {
    strapi: StrapiInterface;
  }

  export type Strapi = StrapiInterface;

  const strapi: StrapiInterface;
}

export default function(opts): Strapi;
