import { type Text, type Element, Node, Editor } from 'slate';

export type Block<T extends Element['type']> = Extract<Node, { type: T }>;

// Wrap Object.entries to get the correct types
export const getEntries = <T extends object>(object: T) =>
  Object.entries(object) as [keyof T, T[keyof T]][];

// Wrap Object.keys to get the correct types
export const getKeys = <T extends object>(object: T) => Object.keys(object) as (keyof T)[];

export const isText = (node: unknown): node is Text => {
  return Node.isNode(node) && !Editor.isEditor(node) && node.type === 'text';
};
