import { type Element, Editor, Transforms } from 'slate';

/**
 * Extracts some logic that is common to most blocks' handleConvert functions.
 * It breaks out of the parent list if the selection is inside a list.
 * And returns a NodeEntry of the selected block.
 */
const prepareHandleConvert = (editor: Editor) => {
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

  // Can't return entry directly because TS isn't smart enough to understand it can't be an editor
  return [entry[0], entry[1]] as const;
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

export { prepareHandleConvert, isLastBlockType, insertEmptyBlockAtLast };
