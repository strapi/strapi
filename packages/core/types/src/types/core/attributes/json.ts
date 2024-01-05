import type * as Utils from '../../utils';
import type { Attribute } from '..';

export type JsonValue = Utils.JSONValue;

export type JSON = Attribute.OfType<'json'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.RequiredOption &
  Attribute.PrivateOption &
  Attribute.WritableOption &
  Attribute.VisibleOption &
  Attribute.DefaultOption<Utils.JSONPrimitive>;

export type GetJsonValue<T extends Attribute.Attribute> = T extends JSON ? JsonValue : never;
