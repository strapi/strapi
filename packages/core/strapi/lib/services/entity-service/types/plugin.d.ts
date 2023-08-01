import type { Common, Plugin, Utils, Shared, Registry } from '@strapi/strapi';

export type GetPluginParams<TSchemaUID extends Common.UID.Schema> = Utils.Guard.Never<
  Utils.Object.Values<{
    [TPluginName in keyof Shared.EntityServicePluginParams]: Shared.EntityServicePluginParams[TPluginName] extends infer TParam
      ? Utils.Expression.If<Plugin.IsEnabled<TPluginName, TSchemaUID>, TParam, never>
      : never;
  }>,
  {}
>;
