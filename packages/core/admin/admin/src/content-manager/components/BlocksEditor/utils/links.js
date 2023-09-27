import { Transforms, Editor, Element as SlateElement, Node } from 'slate';

const removeLink = (editor) => {
  Transforms.unwrapNodes(editor, {
    match: (node) => !Editor.isEditor(node) && SlateElement.isElement(node) && node.type === 'link',
  });
};

const insertLink = (editor, { url }) => {
  if (editor.selection) {
    const [parentNode] = Editor.parent(editor, editor.selection.focus?.path);

    // If we are creating a link inside another link, we remove the parent link
    if (parentNode.type === 'link') {
      removeLink(editor);
    }

    Transforms.wrapNodes(editor, { type: 'link', url }, { split: true });
  }
};

const editLink = (editor, { url, text }) => {
  if (editor.selection) {
    const [linkNode, linkPath] = Editor.above(editor, { match: (node) => node.type === 'link' });

    if (linkNode) {
      Transforms.setNodes(editor, { url }, { at: linkPath });

      if (text !== '' && text !== Editor.string(editor, linkPath)) {
        const linkNodeChildrens = Array.from(Node.children(editor, linkPath, { reverse: true }));

        linkNodeChildrens.forEach(([, childPath]) => {
          Transforms.removeNodes(editor, { at: childPath });
        });

        Transforms.insertNodes(editor, [{ text }], { at: linkPath.concat(0) });
      }
    }
  }
};

export { insertLink, editLink, removeLink };
