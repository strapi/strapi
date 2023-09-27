import { Path, Node, Transforms } from 'slate';

const withLinks = (editor) => {
  const { isInline, apply, normalizeNode } = editor;

  editor.isInline = (element) => {
    return element.type === 'link' ? true : isInline(element);
  };

  // We keep a track of the last inserted link path
  // So we can show the popover on the link component if that link is the last one inserted
  editor.lastInsertedLinkPath = null;

  editor.apply = (operation) => {
    if (operation.type === 'insert_node') {
      if (operation.node.type === 'link') {
        editor.lastInsertedLinkPath = operation.path;
      }
    } else if (operation.type === 'move_node') {
      // We need to update the last inserted link path when link is moved
      // If link is the first word in the paragraph we dont need to update the path
      if (Path.hasPrevious(operation.path)) {
        editor.lastInsertedLinkPath = Path.transform(editor.lastInsertedLinkPath, operation);
      }
    }

    apply(operation);
  };

  // By default Slate add text nodes without type
  // Here we ensure that all link's children are text nodes with the correct type
  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    if (node.type === 'link') {
      Array.from(Node.children(editor, path)).forEach(([childNode, childPath]) => {
        if (childNode.type !== 'text') {
          Transforms.setNodes(editor, { type: 'text' }, { at: childPath });
        }
      });
    }

    normalizeNode(entry);
  };

  return editor;
};

export { withLinks };
