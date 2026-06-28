import * as React from 'react';

import { createContext } from '@strapi/admin/strapi-admin';
import { MessageDescriptor } from 'react-intl';
import { Editor, type Descendant, Element } from 'slate';
import { type RenderElementProps, useSlate } from 'slate-react';
import { type CSSProperties } from 'styled-components';

import { type ModifiersStore } from './Modifiers';

import type { Schema } from '@strapi/types';

type CustomNode = Omit<Schema.Attribute.BlocksNode, 'type'> & {
  type: Schema.Attribute.BlocksNode['type'] | string;
  level?: number;
  format?: string;
};

type BaseBlock = {
  renderElement: (props: RenderElementProps) => React.JSX.Element;
  matchNode: (node: Schema.Attribute.BlocksNode | CustomNode) => boolean;
  handleConvert?: (editor: Editor) => void | (() => React.JSX.Element);
  handleEnterKey?: (editor: Editor) => void;
  handleBackspaceKey?: (editor: Editor, event: React.KeyboardEvent<HTMLElement>) => void;
  handleTab?: (editor: Editor) => void;
  handleShiftTab?: (editor: Editor) => void;
  snippets?: string[];
  dragHandleTopMargin?: CSSProperties['marginTop'];
  plugin?: (editor: Editor) => Editor;
  isDraggable?: (element: Element) => boolean;
};

type NonSelectorBlock = BaseBlock & {
  isInBlocksSelector?: false;
};

type SelectorBlock = BaseBlock & {
  isInBlocksSelector: true;
  icon?: React.ComponentType;
  label: MessageDescriptor;
};

type NonSelectorBlockKey = 'list-item' | 'link';

const selectorBlockKeys = [
  'paragraph',
  'heading-one',
  'heading-two',
  'heading-three',
  'heading-four',
  'heading-five',
  'heading-six',
  'list-ordered',
  'list-unordered',
  'image',
  'quote',
  'code',
] as const;

type SelectorBlockKey = (typeof selectorBlockKeys)[number];

const isSelectorBlockKey = (key: unknown): key is SelectorBlockKey => {
  return typeof key === 'string' && selectorBlockKeys.includes(key as SelectorBlockKey);
};

type BlocksStore = {
  [K in SelectorBlockKey]: SelectorBlock;
} & {
  [K in NonSelectorBlockKey]: NonSelectorBlock;
};

type RichTextBlocksStore = Partial<BlocksStore> & Record<string, SelectorBlock | NonSelectorBlock>;

type BlocksEditorContextValue = {
  blocks: RichTextBlocksStore;
  modifiers: ModifiersStore;
  disabled: boolean;
  name: string;
  setLiveText: (text: string) => void;
  isExpandedMode: boolean;
  flushPendingFormSync: () => void;
};

const [BlocksEditorProvider, usePartialBlocksEditorContext] =
  createContext<BlocksEditorContextValue>('BlocksEditor');

function useBlocksEditorContext(consumerName: string): BlocksEditorContextValue & {
  editor: Editor;
} {
  const context = usePartialBlocksEditorContext(consumerName, (state) => state);
  const editor = useSlate();

  return {
    ...context,
    editor,
  };
}

const normalizeBlocksState = (
  editor: Editor,
  value: Schema.Attribute.BlocksValue | Descendant[]
): Schema.Attribute.BlocksValue | Descendant[] | null => {
  const isEmpty =
    value.length === 1 && Editor.isEmpty(editor, value[0] as Schema.Attribute.BlocksNode);

  return isEmpty ? null : value;
};

export {
  BlocksEditorProvider,
  isSelectorBlockKey,
  normalizeBlocksState,
  useBlocksEditorContext,
  selectorBlockKeys,
};

export type {
  BlocksStore,
  CustomNode,
  NonSelectorBlock,
  RichTextBlocksStore,
  SelectorBlock,
  SelectorBlockKey,
};
