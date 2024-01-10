export type JSONValue = JSONPrimitive | JSONObject | JSONArray;

export type JSONPrimitive = string | number | boolean | null;

export type JSONArray = Array<JSONValue>;

export interface JSONObject {
  [key: string]: JSONValue;
}
