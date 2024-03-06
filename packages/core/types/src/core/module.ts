import type { Router, Controller, Service, Policy, Middleware, Strapi } from ".";
import type { ContentType } from '../schema';


export interface Module {
  bootstrap: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  destroy: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  register: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  config<TDefault = unknown, TResult = unknown>(path: string, defaultValue?: TDefault): TResult;
  routes: Record<string, Router>;
  controllers: Record<string, Controller>;
  services: Record<string, Service>;
  policies: Record<string, Policy>;
  middlewares: Record<string, Middleware>;
  contentTypes: Record<string, { schema: ContentType }>;

  controller<T extends Controller>(name: string): T;
  service<T extends Service>(name: string): T;
}
