import type { Descendant, Element, Text } from 'slate';

/**
 * Recursively sanitizes a Slate document to ensure it follows the strict schema:
 * - Text nodes must only have 'text' (and optional marks), no 'children'.
 * - Element nodes must have 'children', no 'text'.
 *
 * This prevents the "Cannot find a descendant at path" crash by ensuring
 * the internal Slate tree is consistently structured.
 */
const sanitizeBlocks = (nodes: unknown): Descendant[] => {
  if (!Array.isArray(nodes)) {
    return [];
  }

  return nodes.map((node): Descendant => {
    if (typeof node !== 'object' || node === null) {
      return { type: 'text', text: '' } as unknown as Text;
    }

    // 1. If it has a 'text' property, it MUST be a text node
    if ('text' in node) {
      const { children: _children, ...rest } = node as Record<string, unknown>;

      // In Strapi v5, text nodes are expected to have type: 'text'
      if (!rest.type) {
        rest.type = 'text';
      }

      return rest as unknown as Text;
    }

    // 2. If it has 'children', it MUST be an element node
    if ('children' in node) {
      const { text: _text, children, ...rest } = node as Record<string, unknown>;

      // Recursively sanitize children
      return {
        ...rest,
        children: sanitizeBlocks(children),
      } as unknown as Element;
    }

    // 3. Fallback for completely malformed nodes: convert to a safe text node
    return { type: 'text', text: '' } as unknown as Text;
  });
};

export { sanitizeBlocks };
