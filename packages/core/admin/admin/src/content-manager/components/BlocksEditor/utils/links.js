import { Transforms, Editor, Element as SlateElement, Node, Range } from 'slate';

/**
 *
 * @param {string} url
 * @param {string} protocol
 */
const addProtocol = (url, protocol = 'https://') => {
  const allowedProtocols = ['http://', 'https://', 'mailto:', 'tel:'];

  if (allowedProtocols.some((allowedProtocol) => url.startsWith(allowedProtocol))) {
    return url;
  }

  return `${protocol}${url}`;
};

/**
 *
 * @param {import('slate').Editor} editor
 */
const removeLink = (editor) => {
  Transforms.unwrapNodes(editor, {
    match: (node) => !Editor.isEditor(node) && SlateElement.isElement(node) && node.type === 'link',
  });
};

/**
 *
 * @param {import('slate').Editor} editor
 * @param {object} link
 * @param {string} link.url
 */
const insertLink = (editor, { url }) => {
  if (editor.selection) {
    // We want to remove all link on the selection
    const linkNodes = Array.from(
      Editor.nodes(editor, {
        at: editor.selection,
        match: (node) => node.type === 'link',
      })
    );

    linkNodes.forEach(([, path]) => {
      Transforms.unwrapNodes(editor, { at: path });
    });

    if (Range.isCollapsed(editor.selection)) {
      const link = { type: 'link', url: url ? addProtocol(url) : '', children: [{ text: url }] };

      Transforms.insertNodes(editor, link);
    } else {
      Transforms.wrapNodes(
        editor,
        { type: 'link', url: url ? addProtocol(url) : '' },
        { split: true }
      );
    }
  }
};

/**
 *
 * @param {import('slate').Editor} editor
 * @param {object} link
 * @param {string} link.url
 * @param {string} link.text
 */
const editLink = (editor, { url, text }) => {
  if (editor.selection) {
    const [linkNode, linkPath] = Editor.above(editor, { match: (node) => node.type === 'link' });

    if (linkNode) {
      Transforms.setNodes(editor, { url: addProtocol(url) }, { at: linkPath });

      // If link text is different, we remove the old text and insert the new one
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
