import { type Text, Node, Editor, Element, Transforms } from 'slate';

const isText = (node: unknown): node is Text => {
  return Node.isNode(node) && !Editor.isEditor(node) && node.type === 'text';
};

/**
 * This plugin is used to normalize the Slate document to match the Strapi schema.
 */
const withStrapiSchema = (editor: Editor) => {
  const { normalizeNode } = editor;

  /**
   * On the strapi schema, we want text nodes to have type: text
   * By default, Slate add text nodes without type: text
   * So we add this normalization for the cases when Slate add text nodes automatically
   */
  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    /**
     * A document with no block leaves nowhere to put the cursor, and every toolbar
     * action and key handler acts on the selection. Deleting every block (e.g.
     * several selected images) gets back the empty paragraph a new document starts with.
     */
    if (Editor.isEditor(node) && node.children.length === 0) {
      Transforms.insertNodes(
        editor,
        { type: 'paragraph', children: [{ type: 'text', text: '' }] },
        { at: [0], select: true }
      );

      return;
    }

    if (!Element.isElement(node) && !isText(node)) {
      Transforms.setNodes(editor, { type: 'text' }, { at: path });

      return;
    }

    normalizeNode(entry);
  };

  return editor;
};

export { withStrapiSchema };
