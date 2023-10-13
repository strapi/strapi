import { Element, Transforms } from 'slate';

/**
 * This plugin is used to normalize the Slate document to match the Strapi schema.
 *
 * @param {import('slate').Editor} editor
 */
const withStrapiSchema = (editor) => {
  const { normalizeNode } = editor;

  /**
   * On the strapi schema, we want text nodes to have type: text
   * By default, Slate add text nodes without type: text
   * So we add this normalization for the cases when Slate add text nodes automatically
   */
  editor.normalizeNode = (entry) => {
    const [node, path] = entry;

    if (!Element.isElement(node)) {
      if (node.type !== 'text') {
        Transforms.setNodes(editor, { type: 'text' }, { at: path });

        return;
      }
    }

    normalizeNode(entry);
  };

  return editor;
};

export { withStrapiSchema };
