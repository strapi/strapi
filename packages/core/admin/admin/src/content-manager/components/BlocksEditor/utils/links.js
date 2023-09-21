import { Transforms, Editor, Element as SlateElement, Range } from 'slate';
import { ReactEditor } from 'slate-react';

const removeLink = (editor) => {
  Transforms.unwrapNodes(editor, {
    match: (node) => !Editor.isEditor(node) && SlateElement.isElement(node) && node.type === 'link',
  });
};

const insertLink = (editor, { url, text }) => {
  const { selection } = editor;

  const linkElement = {
    type: 'link',
    url,
    children: [{ text }],
  };

  ReactEditor.focus(editor);
  const selectedText = Editor.string(editor, selection);

  if (selection) {
    const [parentNode] = Editor.parent(editor, selection.focus?.path);

    // If we are creating a link inside another link, we remove the parent link
    if (parentNode.type === 'link') {
      removeLink(editor);
    }

    if (Range.isCollapsed(selection)) {
      Transforms.insertNodes(editor, linkElement, { select: true });
    } else if (text !== selectedText) {
      // If user changed the selected text, we need to remove the selection and created everything from scratch
      // If not, we can wrap everything in a link node
      Transforms.insertNodes(editor, linkElement, { select: true });
    } else {
      Transforms.wrapNodes(editor, { type: 'link', url }, { split: true });
    }
  } else {
    Transforms.insertNodes(editor, { type: 'paragraph', children: [linkElement] });
  }
};

export { insertLink, removeLink };
