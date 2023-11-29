import * as React from 'react';

import { Quote } from '@strapi/icons';
import { type Text, Editor, Node, Transforms } from 'slate';
import styled from 'styled-components';

import { type BlocksStore } from '../BlocksEditor';
import { baseHandleConvert } from '../utils/conversions';
import { type Block } from '../utils/types';

const Blockquote = styled.blockquote.attrs({ role: 'blockquote' })`
  margin: ${({ theme }) => `${theme.spaces[2]} 0`};
  font-weight: ${({ theme }) => theme.fontWeights.regular};
  border-left: ${({ theme }) => `${theme.spaces[1]} solid ${theme.colors.neutral200}`};
  padding: ${({ theme }) => theme.spaces[2]} ${({ theme }) => theme.spaces[4]};
  color: ${({ theme }) => theme.colors.neutral600};
`;

const isText = (node: unknown): node is Text => {
  return Node.isNode(node) && !Editor.isEditor(node) && node.type === 'text';
};

const quoteBlocks: Pick<BlocksStore, 'quote'> = {
  quote: {
    renderElement: (props) => <Blockquote {...props.attributes}>{props.children}</Blockquote>,
    icon: Quote,
    label: {
      id: 'components.Blocks.blocks.quote',
      defaultMessage: 'Quote',
    },
    matchNode: (node) => node.type === 'quote',
    isInBlocksSelector: true,
    handleConvert(editor) {
      baseHandleConvert<Block<'quote'>>(editor, { type: 'quote' });
    },
    handleEnterKey(editor) {
      /**
       * To determine if we should break out of the quote node, check 2 things:
       * 1. If the cursor is at the end of the quote node
       * 2. If the last line of the quote node is empty
       */
      const quoteNodeEntry = Editor.above(editor, {
        match: (node) => !Editor.isEditor(node) && node.type === 'quote',
      });
      if (!quoteNodeEntry || !editor.selection) {
        return;
      }
      const [quoteNode, quoteNodePath] = quoteNodeEntry;
      const isNodeEnd = Editor.isEnd(editor, editor.selection.anchor, quoteNodePath);
      const lastTextNode = quoteNode.children.at(-1);
      const isEmptyLine = isText(lastTextNode) && lastTextNode.text.endsWith('\n');

      if (isNodeEnd && isEmptyLine) {
        // Remove the last line break
        Transforms.delete(editor, { distance: 1, unit: 'character', reverse: true });
        // Break out of the quote node new paragraph
        Transforms.insertNodes(editor, {
          type: 'paragraph',
          children: [{ type: 'text', text: '' }],
        });
      } else {
        // Otherwise insert a new line within the quote node
        Transforms.insertText(editor, '\n');

        // If there's nothing after the cursor, disable modifiers
        if (isNodeEnd) {
          Editor.removeMark(editor, 'bold');
          Editor.removeMark(editor, 'italic');
        }
      }
    },
  },
};

export { quoteBlocks };
