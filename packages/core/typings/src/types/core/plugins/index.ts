import type { Common, Shared, Utils } from '../..';

// TODO: this might need to move somewhere else (or else our additions need to move somewhere else)
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

export * as Config from './config';
