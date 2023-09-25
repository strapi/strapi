import type { Common, Schema } from '..';
import type { Strapi } from '../../..';

export interface Module {
  bootstrap: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  destroy: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  register: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  config<TDefault = unknown, TResult = unknown>(path: string, defaultValue?: TDefault): TResult;
  routes: Record<string, Common.Router>;
  controllers: Record<string, Common.Controller>;
  services: Record<string, Common.Service>;
  policies: Record<string, Common.Policy>;
  middlewares: Record<string, Common.Middleware>;
  contentTypes: Record<string, { schema: Schema.ContentType }>;

  controller<T extends Common.Controller>(name: string): T;
  service<T extends Common.Service>(name: string): T;
}
