// TODO: move to src/index.ts once we can move export assignment to export default in v5
import type { Strapi as StrapiInterface, LoadedStrapi } from './src/Strapi';
import * as Types from './dist/types';

declare global {
  var strapi: StrapiInterface;

  namespace Strapi {
    export type Strapi = StrapiInterface;
    export type Loaded = LoadedStrapi;
  }

  namespace NodeJS {
    interface Global {
      strapi: StrapiInterface;
    }
  }
}

export * from './src/types';
export * as factories from './src/factories';
export type { StrapiInterface as Strapi };

declare module 'koa-favicon' {
  import type Koa from 'koa';

  export default function favicon(
    path: string,
    options?: { maxAge?: number; mime?: string }
  ): Koa.Middleware;
}
