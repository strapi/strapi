import type { Attribute } from '..';

export type JSON = Attribute.OfType<'json'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.RequiredOption &
  Attribute.PrivateOption &
  Attribute.WritableOption &
  Attribute.VisibleOption &
  Attribute.DefaultOption<JsonValue>;

export type ValidJson = object | Array<unknown> | string | number | true | false | null;

export type JsonValue<T extends ValidJson = ValidJson> = T;

export type GetJsonValue<T extends Attribute.Attribute> = T extends JSON ? JsonValue : never;
