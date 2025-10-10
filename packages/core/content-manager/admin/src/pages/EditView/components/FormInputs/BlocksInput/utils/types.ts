import type { Schema } from '@strapi/types';
import type { Element, Node } from 'slate';

type Block<T extends Element['type']> = Extract<Node, { type: T }>;

// Wrap Object.entries to get the correct types
const getEntries = <T extends object>(object: T) =>
  Object.entries(object) as [keyof T, T[keyof T]][];

// Wrap Object.keys to get the correct types
const getKeys = <T extends object>(object: T) => Object.keys(object) as (keyof T)[];

const isLinkNode = (element: Element): element is Schema.Attribute.LinkInlineNode => {
  return element.type === 'link';
};

const isListNode = (element: Element): element is Schema.Attribute.ListBlockNode => {
  return element.type === 'list';
};

export { type Block, getEntries, getKeys, isLinkNode, isListNode };
