/**
 *
 * Extract the array values into an union type
 *
 **/
export type Values<TCollection extends Array<unknown>> = TCollection extends Array<infer TValues>
  ? TValues
  : never;
