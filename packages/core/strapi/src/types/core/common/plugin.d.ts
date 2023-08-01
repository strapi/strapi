import type { Common } from '..';
import type { Strapi } from '../../Strapi';

export interface Plugin {
  bootstrap: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  destroy: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  register: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  config: {
    default: Record<string, unknown> | ((opts: { env: typeof env }) => Record<string, unknown>);
    validator: (config: Record<string, unknown>) => void;
  };
  routes: Record<string, Common.Router | Common.Route[]>;
  controllers: Record<string, Common.Controller>;
  services: Record<string, Common.Service>;
  policies: Record<string, Common.Policy>;
  middlewares: Record<string, Common.Middleware>;
  contentTypes: Record<string, { schema: Schema.ContentType }>;

  controller(name: string): Common.Controller;
}
