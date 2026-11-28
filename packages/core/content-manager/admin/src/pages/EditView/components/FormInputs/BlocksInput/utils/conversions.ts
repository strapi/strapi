import { Element, type Path, Editor, Transforms } from 'slate';

/**
 * Extracts some logic that is common to most blocks' handleConvert functions.
 * @returns The paths of the converted blocks
 */
const baseHandleConvert = <T extends Element>(
  editor: Editor,
  attributesToSet: Partial<T> & { type: T['type'] }
): void | Path[] => {
  // If there is no selection, convert last inserted node
  const [_, lastNodePath] = Editor.last(editor, []);

  // If the selection is inside a list, split the list so that the modified block is outside of it
  Transforms.unwrapNodes(editor, {
    match: (node) => !Editor.isEditor(node) && node.type === 'list',
    split: true,
    at: editor.selection ?? lastNodePath,
  });

  // Make sure we get block nodes, not inline nodes or list containers
  const [, updatedLastNodePath] = Editor.last(editor, []);
  const selectedBlocks = Array.from(
    Editor.nodes(editor, {
      match: (node): node is Element =>
        !Editor.isEditor(node) &&
        Element.isElement(node) &&
        node.type !== 'link' &&
        node.type !== 'list',
      at: editor.selection ?? updatedLastNodePath,
    })
  );

  if (selectedBlocks.length === 0) {
    return;
  }

  const convertedPaths: Path[] = [];

  selectedBlocks.forEach(([element, elementPath]) => {
    Transforms.setNodes(
      editor,
      {
        ...getAttributesToClear(element),
        ...attributesToSet,
      } as Partial<Element>,
      { at: elementPath }
    );

    convertedPaths.push(elementPath);
  });

  return convertedPaths.length > 0 ? convertedPaths : undefined;
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
