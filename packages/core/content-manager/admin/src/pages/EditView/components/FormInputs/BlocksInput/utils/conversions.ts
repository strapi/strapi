import { type Element, Editor, Transforms } from 'slate';

/**
 * Extracts some logic that is common to most blocks' handleConvert functions.
 * @returns The path of the converted block
 */
const baseHandleConvert = <T extends Element>(
  editor: Editor,
  attributesToSet: Partial<T> & { type: T['type'] }
): void => {
  // If there is no selection, convert last inserted node
  const [_, lastNodePath] = Editor.last(editor, []);

  // If the selection is inside a list, split the list so that the modified block is outside of it
  Transforms.unwrapNodes(editor, {
    match: (node) => !Editor.isEditor(node) && node.type === 'list',
    split: true,
    at: editor.selection ?? lastNodePath,
  });

  // Make sure we get block nodes (elements), not an inline node
  const [, updatedLastNodePath] = Editor.last(editor, []);
  const nodes = Editor.nodes(editor, {
    match: (node) => !Editor.isEditor(node) && node.type !== 'text' && node.type !== 'link',
    at: editor.selection ?? updatedLastNodePath,
  });

  if (!nodes) {
    return;
  }

  for (const [element, elementPath] of nodes) {
    Transforms.setNodes(
      editor,
      {
        ...getAttributesToClear(element as Element), // because of the match we can safely assume it's a Node of type Element
        ...attributesToSet,
      } as Partial<Element>,
      { at: elementPath }
    );
  }
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

export { baseHandleConvert, getAttributesToClear };
