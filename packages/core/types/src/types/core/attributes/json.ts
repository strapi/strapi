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
  Attribute.DefaultOption<Utils.JSONPrimitive>; // TODO: should be Utils.JSONValue but it breaks the admin build

export type GetJsonValue<T extends Attribute.Attribute> = T extends JSON ? JsonValue : never;
