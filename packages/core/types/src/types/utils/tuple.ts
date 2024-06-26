import type { Literal } from './string';

/**
 * Aggregate the given tuple into a string, separated by the given `TSeparator` literal
 */
export type Join<TCollection extends unknown[], TSeparator extends Literal> = TCollection extends [
  infer THead extends Literal,
  ...infer TTail
]
  ? TTail['length'] extends 0
    ? THead
    : `${THead}${TSeparator}${Join<TTail, TSeparator>}`
  : never;
