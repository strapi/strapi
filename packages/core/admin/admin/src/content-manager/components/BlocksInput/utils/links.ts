import { Transforms, Editor, Element as SlateElement, Node, Range } from 'slate';

import { type Block } from './types';

const removeLink = (editor: Editor) => {
  Transforms.unwrapNodes(editor, {
    match: (node) => !Editor.isEditor(node) && SlateElement.isElement(node) && node.type === 'link',
  });
};

const insertLink = (editor: Editor, { url }: { url: string }) => {
  if (editor.selection) {
    // We want to remove all link on the selection
    const linkNodes = Array.from(
      Editor.nodes(editor, {
        at: editor.selection,
        match: (node) => !Editor.isEditor(node) && node.type === 'link',
      })
    );

    linkNodes.forEach(([, path]) => {
      Transforms.unwrapNodes(editor, { at: path });
    });

    if (Range.isCollapsed(editor.selection)) {
      const link: Block<'link'> = {
        type: 'link',
        url: url ?? '',
        children: [{ type: 'text', text: url }],
      };

      Transforms.insertNodes(editor, link);
    } else {
      Transforms.wrapNodes(editor, { type: 'link', url: url ?? '' } as Block<'link'>, {
        split: true,
      });
    }
  }
};

const editLink = (editor: Editor, link: { url: string; text: string }) => {
  const { url, text } = link;

  if (!editor.selection) {
    return;
  }

  const linkEntry = Editor.above(editor, {
    match: (node) => !Editor.isEditor(node) && node.type === 'link',
  });

  if (linkEntry) {
    const [, linkPath] = linkEntry;
    Transforms.setNodes(editor, { url }, { at: linkPath });

    // If link text is different, we remove the old text and insert the new one
    if (text !== '' && text !== Editor.string(editor, linkPath)) {
      const linkNodeChildrens = Array.from(Node.children(editor, linkPath, { reverse: true }));

      linkNodeChildrens.forEach(([, childPath]) => {
        Transforms.removeNodes(editor, { at: childPath });
      });

      Transforms.insertNodes(editor, [{ type: 'text', text }], { at: linkPath.concat(0) });
    }
  }
};

export { insertLink, editLink, removeLink };
