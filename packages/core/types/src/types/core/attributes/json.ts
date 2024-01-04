import type { Attribute } from '..';

export type JSON = Attribute.OfType<'json'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.RequiredOption &
  Attribute.PrivateOption &
  Attribute.WritableOption &
  Attribute.VisibleOption &
  Attribute.DefaultOption<JSONValue>;

type JSONValue = string | number | boolean | null;

type JSONArray = JsonValue[] | readonly JsonValue[];

export interface JSONObject {
  [key: string]: JSONValue;
}

export type JsonValue = JSONValue | JSONObject | JSONArray;

export type GetJsonValue<T extends Attribute.Attribute> = T extends JSON ? JsonValue : never;
