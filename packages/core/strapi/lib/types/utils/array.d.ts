/**
 *
 * Extract the array values into an union type
 *
 **/
export type Values<T extends Array<unknown>> = T extends Array<infer U> ? U : never;
