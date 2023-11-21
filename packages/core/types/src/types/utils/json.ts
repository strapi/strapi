export type Value = string | number | boolean | null | Object | List;

export type List = Array<Value>;

export interface Object {
  [key: string]: Value;
}
