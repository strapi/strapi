import type { Element, Node } from 'slate';

type Block<T extends Element['type']> = Extract<Node, { type: T }>;

// Wrap Object.entries to get the correct types
const getEntries = <T extends object>(object: T) =>
  Object.entries(object) as [keyof T, T[keyof T]][];

// Wrap Object.keys to get the correct types
const getKeys = <T extends object>(object: T) => Object.keys(object) as (keyof T)[];

function isNonNullable<T>(value: T): value is NonNullable<T> {
  return value !== null && value !== undefined;
}

export { type Block, getEntries, getKeys, isNonNullable };
