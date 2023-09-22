import { Transforms, Editor, Element as SlateElement, Range } from 'slate';

const removeLink = (editor) => {
  Transforms.unwrapNodes(editor, {
    match: (node) => !Editor.isEditor(node) && SlateElement.isElement(node) && node.type === 'link',
  });
};

const insertLink = (editor, { url, text }) => {
  const linkElement = {
    type: 'link',
    url,
    children: [{ text }],
  };

  const selectedText = Editor.string(editor, editor.selection);

  if (editor.selection) {
    const [parentNode] = Editor.parent(editor, editor.selection.focus?.path);

    // If we are creating a link inside another link, we remove the parent link
    if (parentNode.type === 'link') {
      removeLink(editor);
    }

    // If user changed the selected text, we need to remove the editor.selection and created everything from scratch
    if (Range.isCollapsed(editor.selection) || text !== selectedText) {
      Transforms.insertNodes(editor, linkElement, { select: true });
    } else {
      // If not, we can wrap everything in a link node
      Transforms.wrapNodes(editor, { type: 'link', url }, { split: true });
    }
  } else {
    Transforms.insertNodes(editor, { type: 'paragraph', children: [linkElement] });
  }
};

export { insertLink, removeLink };
