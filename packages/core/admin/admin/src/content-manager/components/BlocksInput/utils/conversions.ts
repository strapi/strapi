import * as React from 'react';

import { type Element, type Path, Editor, Transforms } from 'slate';

/**
 * Extracts some logic that is common to most blocks' handleConvert functions.
 * @returns The path of the converted block
 */
const baseHandleConvert = <T extends Element>(
  editor: Editor,
  attributesToSet: Partial<T> & { type: T['type'] }
): void | Path => {
  // If the selection is inside a list, split the list so that the modified block is outside of it
  Transforms.unwrapNodes(editor, {
    match: (node) => !Editor.isEditor(node) && node.type === 'list',
    split: true,
  });

  // Make sure we get a block node, not an inline node
  const entry = Editor.above(editor, {
    match: (node) => !Editor.isEditor(node) && node.type !== 'text' && node.type !== 'link',
  });

  if (!entry || Editor.isEditor(entry[0])) {
    return;
  }

  const [element, elementPath] = entry;

  Transforms.setNodes(
    editor,
    {
      ...getAttributesToClear(element),
      ...attributesToSet,
    } as Partial<Element>,
    { at: elementPath }
  );

  return elementPath;
};

/**
 * Set all attributes except type and children to null so that Slate deletes them
 */
const getAttributesToClear = (element: Element) => {
  const { children: _children, type: _type, ...extra } = element;

  const attributesToClear = Object.keys(extra).reduce(
    (currentAttributes, key) => ({ ...currentAttributes, [key]: null }),
    {}
  );

  return attributesToClear as Record<string, null>;
};

/**
 * Checks if the last block in the editor is of the given type.
 */
const isLastBlockType = (editor: Editor, type: Element['type']) => {
  const { selection } = editor;

  if (!selection) return false;

  const [currentBlock] = Editor.nodes(editor, {
    at: selection,
    match: (node) => !Editor.isEditor(node) && node.type === type,
  });

  if (currentBlock) {
    const [, currentNodePath] = currentBlock;

    const isNodeAfter = Boolean(Editor.after(editor, currentNodePath));

    return !isNodeAfter;
  }

  return false;
};

/**
 * Inserts an empty paragraph at the end of the editor.
 */
const insertEmptyBlockAtLast = (editor: Editor) => {
  Transforms.insertNodes(
    editor,
    {
      type: 'paragraph',
      children: [{ type: 'text', text: '' }],
    },
    { at: [editor.children.length] }
  );
};

export { baseHandleConvert, getAttributesToClear, isLastBlockType, insertEmptyBlockAtLast };
