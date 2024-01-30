import * as React from 'react';

import { Typography } from '@strapi/design-system';
import { BulletList, NumberList } from '@strapi/icons';
import { type Text, Editor, Node, Transforms, Path } from 'slate';
import { type RenderElementProps } from 'slate-react';
import styled, { css } from 'styled-components';

import { type BlocksStore } from '../BlocksEditor';
import { baseHandleConvert } from '../utils/conversions';
import { isListNode, type Block } from '../utils/types';

const listStyle = css`
  display: flex;
  flex-direction: column;
  gap: ${({ theme }) => theme.spaces[1]};
  margin-inline-start: ${({ theme }) => theme.spaces[0]};
  margin-inline-end: ${({ theme }) => theme.spaces[0]};
  padding-inline-start: ${({ theme }) => theme.spaces[2]};

  ol,
  ul {
    margin-block-start: ${({ theme }) => theme.spaces[0]};
    margin-block-end: ${({ theme }) => theme.spaces[0]};
  }

  li {
    margin-inline-start: ${({ theme }) => theme.spaces[3]};
  }
`;

const Orderedlist = styled.ol`
  list-style-type: decimal;
  ${listStyle}
`;

const Unorderedlist = styled.ul`
  list-style-type: disc;
  ${listStyle}
`;

const List = ({ attributes, children, element }: RenderElementProps) => {
  if (!isListNode(element)) {
    return null;
  }

  if (element.format === 'ordered') {
    return <Orderedlist {...attributes}>{children}</Orderedlist>;
  }

  return <Unorderedlist {...attributes}>{children}</Unorderedlist>;
};

const replaceListWithEmptyBlock = (editor: Editor, currentListPath: Path) => {
  // Delete the empty list
  Transforms.removeNodes(editor, { at: currentListPath });

  if (currentListPath[0] === 0) {
    // If the list was the only (or first) block element then insert empty paragraph as editor needs default value
    Transforms.insertNodes(
      editor,
      {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      },
      { at: currentListPath }
    );
    Transforms.select(editor, currentListPath);
  }
};

const isText = (node: unknown): node is Text => {
  return Node.isNode(node) && !Editor.isEditor(node) && node.type === 'text';
};

/**
 * Common handler for the backspace event on ordered and unordered lists
 */
const handleBackspaceKeyOnList = (editor: Editor, event: React.KeyboardEvent<HTMLElement>) => {
  if (!editor.selection) return;

  const [currentListItem, currentListItemPath] = Editor.parent(editor, editor.selection.anchor);
  const [currentList, currentListPath] = Editor.parent(editor, currentListItemPath);
  const isListEmpty =
    currentList.children.length === 1 &&
    isText(currentListItem.children[0]) &&
    currentListItem.children[0].text === '';
  const isNodeStart = Editor.isStart(editor, editor.selection.anchor, currentListItemPath);
  const isFocusAtTheBeginningOfAChild =
    editor.selection.focus.offset === 0 && editor.selection.focus.path.at(-1) === 0;

  if (isListEmpty) {
    event.preventDefault();
    replaceListWithEmptyBlock(editor, currentListPath);
  } else if (isNodeStart) {
    Transforms.liftNodes(editor, {
      match: (node) => !Editor.isEditor(node) && node.type === 'list-item',
    });
    // Transforms the list item into a paragraph
    Transforms.setNodes(
      editor,
      { type: 'paragraph' },
      {
        hanging: true,
      }
    );
  } else if (isFocusAtTheBeginningOfAChild) {
    Transforms.liftNodes(editor, {
      match: (node) => !Editor.isEditor(node) && node.type === 'list-item',
    });
    // If the focus is at the beginning of a child node we need to replace it with a paragraph
    Transforms.setNodes(editor, { type: 'paragraph' });
  }
};

/**
 * Common handler for the enter key on ordered and unordered lists
 */
const handleEnterKeyOnList = (editor: Editor) => {
  const currentListItemEntry = Editor.above(editor, {
    match: (node) => !Editor.isEditor(node) && node.type === 'list-item',
  });

  if (!currentListItemEntry || !editor.selection) {
    return;
  }

  const [currentListItem, currentListItemPath] = currentListItemEntry;
  const [currentList, currentListPath] = Editor.parent(editor, currentListItemPath);
  const isListEmpty =
    currentList.children.length === 1 &&
    isText(currentListItem.children[0]) &&
    currentListItem.children[0].text === '';
  const isListItemEmpty =
    currentListItem.children.length === 1 &&
    isText(currentListItem.children[0]) &&
    currentListItem.children[0].text === '';

  if (isListEmpty) {
    replaceListWithEmptyBlock(editor, currentListPath);
  } else if (isListItemEmpty) {
    // Delete the empty list item
    Transforms.removeNodes(editor, { at: currentListItemPath });

    // Create a new paragraph below the parent list
    const listNodeEntry = Editor.above(editor, {
      match: (node) => !Editor.isEditor(node) && node.type === 'list',
    });

    if (!listNodeEntry) {
      return;
    }

    const createdParagraphPath = Path.next(listNodeEntry[1]);
    Transforms.insertNodes(
      editor,
      {
        type: 'paragraph',
        children: [{ type: 'text', text: '' }],
      },
      { at: createdParagraphPath }
    );

    // Move the selection to the newly created paragraph
    Transforms.select(editor, createdParagraphPath);
  } else {
    // Check if the cursor is at the end of the list item
    const isNodeEnd = Editor.isEnd(editor, editor.selection.anchor, currentListItemPath);

    if (isNodeEnd) {
      // If there was nothing after the cursor, create a fresh new list item,
      // in order to avoid carrying over the modifiers from the previous list item
      Transforms.insertNodes(editor, { type: 'list-item', children: [{ type: 'text', text: '' }] });
    } else {
      // If there is something after the cursor, split the current list item,
      // so that we keep the content and the modifiers
      Transforms.splitNodes(editor);
    }
  }
};

/**
 * Common handler for converting a node to a list
 */
const handleConvertToList = (editor: Editor, format: Block<'list'>['format']) => {
  const convertedPath = baseHandleConvert<Block<'list-item'>>(editor, { type: 'list-item' });

  if (!convertedPath) return;

  Transforms.wrapNodes(editor, { type: 'list', format, children: [] }, { at: convertedPath });
};

const listBlocks: Pick<BlocksStore, 'list-ordered' | 'list-unordered' | 'list-item'> = {
  'list-ordered': {
    renderElement: (props) => <List {...props} />,
    label: {
      id: 'components.Blocks.blocks.orderedList',
      defaultMessage: 'Numbered list',
    },
    icon: NumberList,
    matchNode: (node) => node.type === 'list' && node.format === 'ordered',
    isInBlocksSelector: true,
    handleConvert: (editor) => handleConvertToList(editor, 'ordered'),
    handleEnterKey: handleEnterKeyOnList,
    handleBackspaceKey: handleBackspaceKeyOnList,
    snippets: ['1.'],
  },
  'list-unordered': {
    renderElement: (props) => <List {...props} />,
    label: {
      id: 'components.Blocks.blocks.unorderedList',
      defaultMessage: 'Bulleted list',
    },
    icon: BulletList,
    matchNode: (node) => node.type === 'list' && node.format === 'unordered',
    isInBlocksSelector: true,
    handleConvert: (editor) => handleConvertToList(editor, 'unordered'),
    handleEnterKey: handleEnterKeyOnList,
    handleBackspaceKey: handleBackspaceKeyOnList,
    snippets: ['-', '*', '+'],
  },
  'list-item': {
    renderElement: (props) => (
      <Typography as="li" {...props.attributes}>
        {props.children}
      </Typography>
    ),
    // No handleConvert, list items are created when converting to the parent list
    matchNode: (node) => node.type === 'list-item',
    isInBlocksSelector: false,
    dragHandleTopMargin: '-2px',
  },
};

export { listBlocks };
