import { Database } from '@strapi/database';
import { EntityService } from './services/entity-service';

import * as Core from './types/strapi';
export * as factories from './factories';

export type { Core };

// Alias to resolve the Strapi global type easily
export type Strapi = Core.Strapi;

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
