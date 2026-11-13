import { type Descendant, Editor, Node, Path, Range, Transforms } from 'slate';

import { deserializeHtml } from '../utils/deserializeHtml';

import type { RichTextBlocksStore } from '../BlocksEditor';
import type { Schema } from '@strapi/types';

type RootNode = Schema.Attribute.BlocksValue[number];
type InlineNode =
  | Exclude<Schema.Attribute.BlocksInlineNode, { type: 'list-item' }>
  | Schema.Attribute.BlocksTextNode;

const getInlines = (node: { children: unknown[] }): InlineNode[] => {
  return node.children.flatMap((child) => {
    const typed = child as { type: string; children?: unknown[] };

    if (typed.type === 'text' || typed.type === 'link') return [typed as InlineNode];

    // List items and nested lists: keep their text
    return typed.children ? getInlines(typed as { children: unknown[] }) : [];
  });
};

/**
 * A project can remove or replace core blocks with `addRichTextBlocks`. Pasted blocks the editor
 * can't render become paragraphs, and links become text when there is no link block.
 */
const keepRegisteredBlocks = (nodes: RootNode[], blocks: RichTextBlocksStore): RootNode[] => {
  const registered = Object.values(blocks);
  const isRegistered = (node: unknown) =>
    registered.some((block) => block.matchNode(node as Schema.Attribute.BlocksNode));
  const hasLinks = registered.some((block) =>
    block.matchNode({ type: 'link', url: '', rel: '', target: '', children: [] })
  );

  const toParagraphs = (node: RootNode): RootNode[] => {
    if (isRegistered(node)) return [node];

    if (node.type === 'list') {
      return node.children.flatMap((child) =>
        child.type === 'list'
          ? toParagraphs(child)
          : [{ type: 'paragraph', children: getInlines(child) } as RootNode]
      );
    }

    return [{ type: 'paragraph', children: getInlines(node) } as RootNode];
  };

  const withoutLinks = (node: unknown): unknown => {
    const typed = node as { type: string; children?: unknown[] };
    if (!typed.children) return typed;

    return {
      ...typed,
      children: typed.children.flatMap((child) => {
        const typedChild = child as { type: string; children: unknown[] };
        return typedChild.type === 'link' ? typedChild.children : [withoutLinks(child)];
      }),
    };
  };

  const converted = nodes.flatMap(toParagraphs);

  return hasLinks ? converted : (converted.map(withoutLinks) as RootNode[]);
};

/**
 * Inserts pasted blocks next to the block holding the caret. When the caret is in the middle of
 * a block, that block is split and the pasted blocks go between the two halves.
 *
 * Slate's insertFragment is not used for this: it merges the first and last pasted blocks into
 * the current one, which turns a pasted heading into a paragraph and can leave list items at the
 * root of the document.
 */
const insertBlocks = (editor: Editor, blocks: Descendant[]) => {
  if (!editor.selection) {
    Transforms.insertNodes(editor, blocks, { at: [editor.children.length], select: true });
    return;
  }

  if (Range.isExpanded(editor.selection)) {
    Transforms.delete(editor);
  }

  const { anchor } = editor.selection;
  const blockPath = anchor.path.slice(0, 1);
  const block = Node.get(editor, blockPath);

  if (Editor.isEmpty(editor, block as Parameters<typeof Editor.isEmpty>[1])) {
    // Replace the empty paragraph the caret is in rather than leaving it behind. Remove it after
    // inserting: an empty document would be normalized back to an empty paragraph.
    Transforms.insertNodes(editor, blocks, { at: Path.next(blockPath), select: true });
    Transforms.removeNodes(editor, { at: blockPath });
    return;
  }

  let insertAt = Path.next(blockPath);

  if (Editor.isStart(editor, anchor, blockPath)) {
    insertAt = blockPath;
  } else if (!Editor.isEnd(editor, anchor, blockPath)) {
    Transforms.splitNodes(editor, {
      at: anchor,
      match: (_node, path) => path.length === 1,
      always: true,
    });
  }

  Transforms.insertNodes(editor, blocks, { at: insertAt, select: true });
};

/**
 * Keeps the structure and formatting of rich text pasted from other apps (Google Docs, Word,
 * web pages…) instead of pasting it as plain text.
 */
const withHtmlPaste = (blocks: RichTextBlocksStore) => (editor: Editor) => {
  const { insertData } = editor;

  editor.insertData = (data) => {
    const html = data.getData('text/html');

    // Content copied from a Blocks editor is already in the right shape, let Slate handle it
    if (!html || data.types.includes('application/x-slate-fragment')) {
      insertData(data);
      return;
    }

    const nodes = keepRegisteredBlocks(deserializeHtml(html), blocks);

    if (nodes.length === 0) {
      insertData(data);
      return;
    }

    // All operations happen in the same tick, so a single undo reverts the whole paste
    if (nodes.length === 1 && nodes[0].type === 'paragraph') {
      // A single paragraph is pasted inline, at the caret
      Transforms.insertFragment(editor, nodes);
    } else {
      insertBlocks(editor, nodes);
    }
  };

  return editor;
};

export { withHtmlPaste };
