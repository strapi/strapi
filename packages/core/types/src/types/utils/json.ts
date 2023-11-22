export type JSONValue = string | number | boolean | null | JSONObject | JSONArray;

export type JSONArray = Array<JSONValue>;

export interface JSONObject {
  [key: string]: JSONValue;
}
