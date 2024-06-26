import { env } from '@strapi/utils';

import type { Common, Shared, Utils, Schema } from '../..';
import type { Strapi } from '../../..';

export type IsEnabled<
  TName extends keyof any,
  TSchemaUID extends Common.UID.Schema
> = TName extends keyof Shared.PluginActivation
  ? Shared.PluginActivation[TName] extends infer TRule
    ? Utils.Expression.Or<
        Utils.Expression.Not<Common.AreSchemaRegistriesExtended>,
        Utils.Expression.Extends<
          Common.Schemas[TSchemaUID]['pluginOptions'],
          { [key in TName]: TRule }
        >
      >
    : false
  : false;

export type LoadedPlugin = {
  config: {
    default: Record<string, unknown> | ((opts: { env: typeof env }) => Record<string, unknown>);
    validator: (config: Record<string, unknown>) => void;
  };
  bootstrap: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  destroy: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  register: ({ strapi }: { strapi: Strapi }) => void | Promise<void>;
  routes: Record<string, Common.Router>;
  controllers: Record<string, Common.Controller>;
  services: Record<string, Common.Service>;
  policies: Record<string, Common.Policy>;
  middlewares: Record<string, Common.Middleware>;
  contentTypes: Record<string, { schema: Schema.ContentType }>;
};

export * as Config from './config';
