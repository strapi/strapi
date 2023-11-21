import type * as Utils from '../../utils';
import type { Attribute } from '..';

export type JSON = Attribute.OfType<'json'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.RequiredOption &
  Attribute.PrivateOption &
  Attribute.WritableOption &
  Attribute.VisibleOption &
  Attribute.DefaultOption<JsonValue>;

export type JsonValue<T extends Utils.JSON.Value = Utils.JSON.Value> = T;

export type GetJsonValue<T extends Attribute.Attribute> = T extends JSON ? JsonValue : never;
