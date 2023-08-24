import type { Common, Plugin, Utils, Shared } from '@strapi/strapi';

export type GetPluginParams<TSchemaUID extends Common.UID.Schema> = Utils.Guard.OfTypes<
  [never, undefined],
  Utils.Object.Values<{
    [TPluginName in keyof Shared.EntityServicePluginParams]: Shared.EntityServicePluginParams[TPluginName] extends infer TParam
      ? Utils.Expression.If<Plugin.IsEnabled<TPluginName, TSchemaUID>, TParam>
      : never;
  }>,
  unknown
>;
