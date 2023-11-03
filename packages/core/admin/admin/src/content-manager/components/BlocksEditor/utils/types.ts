import { Text, Editor, type Element, type Node } from 'slate';

import { SelectorBlockKey, selectorBlockKeys } from '../hooks/useBlocksStore';

export type Block<T extends Element['type']> = Extract<Node, { type: T }>;

// Wrap Object.entries to get the correct types
export const getEntries = <T extends object>(object: T) =>
  Object.entries(object) as [keyof T, T[keyof T]][];

// Wrap Object.keys to get the correct types
export const getKeys = <T extends object>(object: T) => Object.keys(object) as (keyof T)[];

export const isText = (node: Node | undefined): node is Text => {
  return !Editor.isEditor(node) && node?.type === 'text';
};

export const isSelectorBlockKey = (key: unknown): key is SelectorBlockKey => {
  return typeof key === 'string' && selectorBlockKeys.includes(key as SelectorBlockKey);
};
