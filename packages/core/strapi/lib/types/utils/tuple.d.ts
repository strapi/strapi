import type { Literal } from './string';

/**
 * Aggregate the given tuple into a string, separated by the given `S` literal
 */
export type Join<T extends unknown[], S extends Literal> = T extends [
  infer F extends Literal,
  ...infer R
]
  ? R['length'] extends 0
    ? F
    : `${F}${S}${Join<R, S>}`
  : never;
