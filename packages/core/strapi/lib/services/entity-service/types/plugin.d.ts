import type { Common, Plugin, Utils, Shared, Registry } from '@strapi/strapi';

type AccessKind = 'read' | 'write';

type GetPluginParamsRegistryByAccessKind<TAccessKind extends AccessKind> =
  Utils.Expression.MatchFirst<
    [
      [Utils.Expression.Extends<'read', TAccessKind>, Shared.EntityServicePluginReadParams],
      [Utils.Expression.Extends<'write', TAccessKind>, Shared.EntityServicePluginWriteParams]
    ]
  >;

export type GetPluginParams<
  TSchemaUID extends Common.UID.Schema,
  TAccessKind extends AccessKind
> = GetPluginParamsRegistryByAccessKind<TAccessKind> extends infer TRegistry
  ? Utils.Guard.Never<
      Utils.Object.Values<{
        [TPluginName in keyof TRegistry]: TRegistry[TPluginName] extends infer TParam
          ? Utils.Expression.If<Plugin.IsEnabled<TPluginName, TSchemaUID>, TParam, never>
          : never;
      }>,
      {}
    >
  : never;

export type GetPluginReadParams<TSchemaUID extends Common.UID.Schema> = GetPluginParams<
  TSchemaUID,
  'read'
>;

export type GetPluginWriteParams<TSchemaUID extends Common.UID.Schema> = GetPluginParams<
  TSchemaUID,
  'write'
>;
