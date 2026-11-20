import { isValidLink } from './links';
import { getOfficeListItem, isHiddenOfficeElement } from './officeHtml';

import type { Schema } from '@strapi/types';

/**
 * Turns pasted HTML (Google Docs, Word, Notion, web pages…) into Strapi blocks.
 *
 * Only what the Blocks schema can store is kept: paragraphs, headings, lists, quotes, code,
 * links and the bold/italic/underline/strikethrough/code modifiers. Anything else (images,
 * tables, colors, fonts…) is dropped but its text is kept.
 */

type TextNode = Schema.Attribute.BlocksTextNode;
type LinkNode = Schema.Attribute.LinkInlineNode;
type InlineNode = TextNode | LinkNode;
type ListNode = Schema.Attribute.ListBlockNode;
type ListItemNode = Extract<ListNode['children'][number], { type: 'list-item' }>;
type RootNode = Schema.Attribute.BlocksValue[number];
type Modifiers = Partial<
  Pick<TextNode, 'bold' | 'italic' | 'underline' | 'strikethrough' | 'code'>
>;
type TextBlockType = 'paragraph' | 'heading' | 'quote' | 'code';

const HEADING_LEVELS = { H1: 1, H2: 2, H3: 3, H4: 4, H5: 5, H6: 6 } as const;

const IGNORED_TAGS = new Set([
  'HEAD',
  'META',
  'LINK',
  'STYLE',
  'SCRIPT',
  'TEMPLATE',
  'NOSCRIPT',
  'TITLE',
  'IFRAME',
  'OBJECT',
  'EMBED',
  'SVG',
  'CANVAS',
  'VIDEO',
  'AUDIO',
  'IMG',
  'PICTURE',
  'BUTTON',
  'INPUT',
  'SELECT',
  'TEXTAREA',
]);

// Tags that start a new block. Everything else is treated as inline content.
const BLOCK_TAGS = new Set([
  'ADDRESS',
  'ARTICLE',
  'ASIDE',
  'BLOCKQUOTE',
  'BODY',
  'CAPTION',
  'DD',
  'DETAILS',
  'DIV',
  'DL',
  'DT',
  'FIELDSET',
  'FIGCAPTION',
  'FIGURE',
  'FOOTER',
  'FORM',
  'H1',
  'H2',
  'H3',
  'H4',
  'H5',
  'H6',
  'HEADER',
  'HR',
  'LI',
  'MAIN',
  'NAV',
  'OL',
  'P',
  'PRE',
  'SECTION',
  'SUMMARY',
  'TABLE',
  'TBODY',
  'TD',
  'TFOOT',
  'TH',
  'THEAD',
  'TR',
  'UL',
]);

/* -------------------------------------------------------------------------------------------------
 * Inline content
 * -----------------------------------------------------------------------------------------------*/

const getStyle = (element: Element, property: string) => {
  return (element as HTMLElement).style?.getPropertyValue(property)?.trim().toLowerCase() ?? '';
};

const isBoldWeight = (weight: string) => {
  if (weight === 'bold' || weight === 'bolder') return true;
  const numeric = Number.parseInt(weight, 10);

  return !Number.isNaN(numeric) && numeric >= 600;
};

/**
 * Tags give a modifier, inline styles can add or remove it. Google Docs wraps the whole
 * clipboard in `<b style="font-weight:normal">`, so the style must win over the tag.
 */
const getModifiers = (element: Element, inherited: Modifiers): Modifiers => {
  const modifiers = { ...inherited };

  switch (element.tagName) {
    case 'B':
    case 'STRONG':
      modifiers.bold = true;
      break;
    case 'I':
    case 'EM':
    case 'CITE':
    case 'DFN':
    case 'VAR':
      modifiers.italic = true;
      break;
    case 'U':
    case 'INS':
      modifiers.underline = true;
      break;
    case 'S':
    case 'DEL':
    case 'STRIKE':
      modifiers.strikethrough = true;
      break;
    case 'CODE':
    case 'KBD':
    case 'SAMP':
    case 'TT':
      modifiers.code = true;
      break;
  }

  const fontWeight = getStyle(element, 'font-weight');
  if (fontWeight) {
    modifiers.bold = isBoldWeight(fontWeight);
  }

  const fontStyle = getStyle(element, 'font-style');
  if (fontStyle) {
    modifiers.italic = fontStyle === 'italic' || fontStyle === 'oblique';
  }

  const textDecoration = [
    getStyle(element, 'text-decoration'),
    getStyle(element, 'text-decoration-line'),
  ].join(' ');
  if (textDecoration.includes('underline')) modifiers.underline = true;
  if (textDecoration.includes('line-through')) modifiers.strikethrough = true;
  if (textDecoration.includes('none')) {
    modifiers.underline = false;
    modifiers.strikethrough = false;
  }

  return modifiers;
};

const createText = (text: string, modifiers: Modifiers): TextNode => {
  const node: TextNode = { type: 'text', text };

  (Object.keys(modifiers) as (keyof Modifiers)[]).forEach((key) => {
    if (modifiers[key]) {
      node[key] = true;
    }
  });

  return node;
};

interface InlineContext {
  modifiers: Modifiers;
  preserveWhitespace: boolean;
  /** Inside a link, nested links are flattened to their text */
  inLink: boolean;
}

const collectText = (node: Node, context: InlineContext, output: InlineNode[]) => {
  let text = node.textContent ?? '';

  if (!context.preserveWhitespace) {
    text = text.replace(/[\t\n\r ]+/g, ' ');
  }

  text = text.replace(/\u00a0/g, ' ');

  if (text) {
    output.push(createText(text, context.modifiers));
  }
};

const collectLink = (element: Element, context: InlineContext, output: InlineNode[]) => {
  const url = element.getAttribute('href')?.trim() ?? '';
  const children: InlineNode[] = [];

  element.childNodes.forEach((child) =>
    collectInlines(child, { ...context, inLink: true }, children)
  );

  // Sources style links as underlined text, which is not part of the content
  const texts = children
    .filter((child): child is TextNode => child.type === 'text')
    .map(({ underline: _underline, ...text }) => text);

  // Protocol-relative urls (//example.com) pass isValidLink but point to another site
  const isSafeUrl = isValidLink(url) && !url.startsWith('//');

  if (url && isSafeUrl && texts.some((text) => text.text.trim())) {
    output.push({ type: 'link', url, rel: '', target: '', children: texts });
  } else {
    // Unsupported or empty link: keep the text, drop the link
    output.push(...texts);
  }
};

const collectInlines = (node: Node, context: InlineContext, output: InlineNode[]) => {
  if (node.nodeType === Node.TEXT_NODE) {
    collectText(node, context, output);
    return;
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return;
  }

  const element = node as Element;

  if (IGNORED_TAGS.has(element.tagName) || isHiddenOfficeElement(element)) {
    return;
  }

  if (element.tagName === 'BR') {
    output.push(createText('\n', context.modifiers));
    return;
  }

  // In preformatted content (e.g. code copied from an IDE), each nested block is a line
  if (context.preserveWhitespace && BLOCK_TAGS.has(element.tagName) && output.length > 0) {
    output.push(createText('\n', context.modifiers));
  }

  const modifiers = getModifiers(element, context.modifiers);
  const childContext = {
    ...context,
    modifiers,
    preserveWhitespace: context.preserveWhitespace || element.tagName === 'PRE',
  };

  if (element.tagName === 'A' && !context.inLink) {
    collectLink(element, childContext, output);
    return;
  }

  element.childNodes.forEach((child) => collectInlines(child, childContext, output));
};

const hasSameModifiers = (a: TextNode, b: TextNode) => {
  return (['bold', 'italic', 'underline', 'strikethrough', 'code'] as const).every(
    (key) => Boolean(a[key]) === Boolean(b[key])
  );
};

const mergeTexts = (nodes: TextNode[]) => {
  return nodes.reduce<TextNode[]>((merged, node) => {
    const previous = merged[merged.length - 1];

    if (previous && hasSameModifiers(previous, node)) {
      merged[merged.length - 1] = { ...previous, text: previous.text + node.text };
    } else {
      merged.push(node);
    }

    return merged;
  }, []);
};

interface Leaf {
  text: TextNode;
  link?: LinkNode;
}

/**
 * Collapses whitespace the way a browser renders it: no leading/trailing spaces in a block, no
 * double spaces between inline nodes, no spaces around line breaks. Updates the leaves in place.
 */
const collapseWhitespace = (leaves: Leaf[]) => {
  let previousEndsWithSpace = true; // block start behaves like a preceding space

  let previousLeaf: TextNode | null = null;

  leaves.forEach((leaf) => {
    let text = leaf.text.text.replace(/ *\n */g, '\n');

    if (previousEndsWithSpace || text.startsWith('\n')) {
      text = text.replace(/^ +/, '');
    }

    // No space before a line break, even when they are in different text nodes
    if (text.startsWith('\n') && previousLeaf) {
      previousLeaf.text = previousLeaf.text.replace(/ +$/, '');
    }

    if (text.length > 0) {
      previousEndsWithSpace = text.endsWith(' ') || text.endsWith('\n');
      previousLeaf = leaf.text;
    }

    leaf.text.text = text;
  });

  // Trim trailing whitespace and line breaks at the end of the block
  for (let index = leaves.length - 1; index >= 0; index -= 1) {
    const trimmed = leaves[index].text.text.replace(/[ \n]+$/, '');
    leaves[index].text.text = trimmed;

    if (trimmed.length > 0) break;
  }

  // Leading line breaks (e.g. a <br> right after <p>) are not meaningful either
  for (const leaf of leaves) {
    const trimmed = leaf.text.text.replace(/^\n+/, '');
    leaf.text.text = trimmed;

    if (trimmed.length > 0) break;
  }
};

const normalizeInlines = (inlines: InlineNode[], preserveWhitespace: boolean): InlineNode[] => {
  // Flatten to text leaves so whitespace can be trimmed across node boundaries
  const leaves: Leaf[] = [];
  inlines.forEach((inline) => {
    if (inline.type === 'link') {
      inline.children.forEach((text) => leaves.push({ text: { ...text }, link: inline }));
    } else {
      leaves.push({ text: { ...inline } });
    }
  });

  if (!preserveWhitespace) {
    collapseWhitespace(leaves);
  }

  // Rebuild the inline nodes, grouping consecutive leaves of the same link
  const result: InlineNode[] = [];
  let pendingTexts: TextNode[] = [];

  const flushTexts = () => {
    result.push(...mergeTexts(pendingTexts.filter((text) => text.text.length > 0)));
    pendingTexts = [];
  };

  let index = 0;
  while (index < leaves.length) {
    const { link } = leaves[index];

    if (!link) {
      pendingTexts.push(leaves[index].text);
      index += 1;
      continue;
    }

    flushTexts();
    const linkTexts: TextNode[] = [];
    while (index < leaves.length && leaves[index].link === link) {
      linkTexts.push(leaves[index].text);
      index += 1;
    }

    const children = mergeTexts(linkTexts.filter((text) => text.text.length > 0));
    if (children.length > 0) {
      result.push({ ...link, children });
    }
  }
  flushTexts();

  return result;
};

/* -------------------------------------------------------------------------------------------------
 * Blocks
 * -----------------------------------------------------------------------------------------------*/

interface BlockContext {
  modifiers: Modifiers;
  /** Set inside a <blockquote> so its paragraphs become quotes */
  inQuote: boolean;
}

interface PendingListItem {
  format: ListNode['format'];
  level: number;
  children: InlineNode[];
}

type Collected = { kind: 'block'; node: RootNode } | { kind: 'list-item'; item: PendingListItem };

const hasText = (inlines: InlineNode[]) => {
  return inlines.some((inline) =>
    inline.type === 'link'
      ? inline.children.some((child) => child.text.length > 0)
      : inline.text.length > 0
  );
};

const createTextBlock = (
  type: TextBlockType,
  inlines: InlineNode[],
  extra: { level?: 1 | 2 | 3 | 4 | 5 | 6 } = {}
): RootNode | null => {
  const preserveWhitespace = type === 'code';
  let children = normalizeInlines(inlines, preserveWhitespace);

  if (type === 'code') {
    // Code blocks keep plain text only, like when typing in them
    const text = children
      .map((child) =>
        child.type === 'link' ? child.children.map((c) => c.text).join('') : child.text
      )
      .join('')
      .replace(/\n+$/, '');

    children = text ? [{ type: 'text', text }] : [];
  }

  if (!hasText(children)) {
    return null;
  }

  if (type === 'heading') {
    // Sources often bold whole headings, which headings already are
    const texts = children.flatMap((child) => (child.type === 'link' ? child.children : [child]));

    if (texts.every((text) => text.bold)) {
      const removeBold = ({ bold: _bold, ...text }: TextNode): TextNode => text;
      children = children.map((child) =>
        child.type === 'link'
          ? { ...child, children: child.children.map(removeBold) }
          : removeBold(child)
      );
    }
  }

  switch (type) {
    case 'heading':
      return { type: 'heading', level: extra.level ?? 1, children } as RootNode;
    case 'quote':
      return { type: 'quote', children } as RootNode;
    case 'code':
      // Same default as a code block created from the toolbar
      return { type: 'code', language: 'plaintext', children } as RootNode;
    default:
      return { type: 'paragraph', children } as RootNode;
  }
};

const getInlineContext = (context: BlockContext, preserveWhitespace = false): InlineContext => ({
  modifiers: context.modifiers,
  preserveWhitespace,
  inLink: false,
});

const pushTextBlock = (
  element: Element,
  type: TextBlockType,
  context: BlockContext,
  output: Collected[],
  extra?: { level?: 1 | 2 | 3 | 4 | 5 | 6 }
) => {
  const inlines: InlineNode[] = [];
  collectInlines(element, getInlineContext(context, type === 'code'), inlines);
  const block = createTextBlock(type, inlines, extra);
  if (block) output.push({ kind: 'block', node: block });
};

/**
 * Word Online writes headings as <p role="heading" aria-level="1">
 */
const getAriaHeadingLevel = (element: Element): 1 | 2 | 3 | 4 | 5 | 6 | null => {
  if (element.getAttribute('role') !== 'heading') return null;

  const level = Number.parseInt(element.getAttribute('aria-level') ?? '', 10);

  return level >= 1 && level <= 6 ? (level as 1 | 2 | 3 | 4 | 5 | 6) : null;
};

/**
 * Converts a block element (a heading, a list, a paragraph…) whose inline siblings were already
 * flushed.
 */
const collectBlockElement = (
  element: Element,
  officeListItem: Omit<PendingListItem, 'children'> | null,
  context: BlockContext,
  output: Collected[],
  listLevel: number
) => {
  if (officeListItem) {
    const inlines: InlineNode[] = [];
    collectInlines(element, getInlineContext(context), inlines);
    output.push({ kind: 'list-item', item: { ...officeListItem, children: inlines } });
    return;
  }

  const ariaHeadingLevel = getAriaHeadingLevel(element);

  if (ariaHeadingLevel) {
    pushTextBlock(element, 'heading', context, output, { level: ariaHeadingLevel });
    return;
  }

  // Code copied from an IDE comes as blocks styled `white-space: pre` instead of a <pre>
  if (element.tagName === 'PRE' || getStyle(element, 'white-space') === 'pre') {
    pushTextBlock(element, 'code', context, output);
    return;
  }

  switch (element.tagName) {
    case 'H1':
    case 'H2':
    case 'H3':
    case 'H4':
    case 'H5':
    case 'H6':
      pushTextBlock(element, 'heading', context, output, {
        level: HEADING_LEVELS[element.tagName as keyof typeof HEADING_LEVELS],
      });
      return;

    case 'BLOCKQUOTE':
      collectBlocks(element, { ...context, inQuote: true }, output, listLevel);
      return;

    case 'UL':
    case 'OL':
      collectList(element, context, output, listLevel);
      return;

    case 'LI':
      collectListItem(element, 'unordered', context, output, listLevel);
      return;

    case 'HR':
      return;

    case 'P':
    case 'DT':
    case 'DD':
    case 'CAPTION':
    case 'FIGCAPTION':
    case 'SUMMARY':
    case 'TH':
    case 'TD': {
      // These can still hold nested blocks (e.g. a <ul> in a table cell)
      const containsBlocks = Array.from(element.children).some((child) =>
        BLOCK_TAGS.has(child.tagName)
      );

      if (containsBlocks) {
        collectBlocks(element, context, output, listLevel);
        return;
      }

      pushTextBlock(element, context.inQuote ? 'quote' : 'paragraph', context, output);
      return;
    }

    default:
      // Generic containers: div, section, table, tr…
      collectBlocks(element, context, output, listLevel);
  }
};

/**
 * Walks the children of a block container. Inline children are grouped into paragraphs, block
 * children are converted recursively.
 */
const collectBlocks = (
  parent: Element,
  context: BlockContext,
  output: Collected[],
  listLevel: number
) => {
  let inlineBuffer: Node[] = [];

  const flushInlines = () => {
    if (inlineBuffer.length === 0) return;

    const inlines: InlineNode[] = [];
    inlineBuffer.forEach((node) =>
      collectInlines(
        node,
        { modifiers: context.modifiers, preserveWhitespace: false, inLink: false },
        inlines
      )
    );
    inlineBuffer = [];

    const block = createTextBlock(context.inQuote ? 'quote' : 'paragraph', inlines);
    if (block) output.push({ kind: 'block', node: block });
  };

  parent.childNodes.forEach((node) => {
    if (node.nodeType !== Node.ELEMENT_NODE) {
      if (node.nodeType === Node.TEXT_NODE) inlineBuffer.push(node);
      return;
    }

    const element = node as Element;

    if (IGNORED_TAGS.has(element.tagName) || isHiddenOfficeElement(element)) {
      return;
    }

    const officeListItem = element.tagName === 'P' ? getOfficeListItem(element) : null;

    if (!BLOCK_TAGS.has(element.tagName) && !officeListItem) {
      // An inline wrapper (like Google Docs' <b> around everything) may still contain blocks
      const containsBlocks = Array.from(element.querySelectorAll('*')).some((child) =>
        BLOCK_TAGS.has(child.tagName)
      );

      if (!containsBlocks) {
        inlineBuffer.push(element);
        return;
      }

      flushInlines();
      collectBlocks(
        element,
        { ...context, modifiers: getModifiers(element, context.modifiers) },
        output,
        listLevel
      );
      return;
    }

    flushInlines();
    collectBlockElement(element, officeListItem, context, output, listLevel);
  });

  flushInlines();
};

const collectList = (
  element: Element,
  context: BlockContext,
  output: Collected[],
  listLevel: number
) => {
  const format: ListNode['format'] = element.tagName === 'OL' ? 'ordered' : 'unordered';

  element.childNodes.forEach((child) => {
    if (child.nodeType !== Node.ELEMENT_NODE) return;
    const childElement = child as Element;

    if (childElement.tagName === 'LI') {
      collectListItem(childElement, format, context, output, listLevel);
    } else if (childElement.tagName === 'UL' || childElement.tagName === 'OL') {
      // Invalid but common HTML: a nested list directly inside a list
      collectList(childElement, context, output, listLevel + 1);
    }
  });
};

const collectListItem = (
  element: Element,
  format: ListNode['format'],
  context: BlockContext,
  output: Collected[],
  listLevel: number
) => {
  // Google Docs flattens nested lists and stores the depth in aria-level
  const ariaLevel = Number.parseInt(element.getAttribute('aria-level') ?? '', 10);
  const level = Number.isNaN(ariaLevel) ? listLevel : listLevel + ariaLevel - 1;

  const inlines: InlineNode[] = [];
  const inlineContext = { modifiers: context.modifiers, preserveWhitespace: false, inLink: false };
  const nested: Collected[] = [];

  element.childNodes.forEach((child) => {
    if (child.nodeType === Node.ELEMENT_NODE) {
      const childElement = child as Element;

      if (childElement.tagName === 'UL' || childElement.tagName === 'OL') {
        collectList(childElement, context, nested, level + 1);
        return;
      }

      if (BLOCK_TAGS.has(childElement.tagName) && inlines.length > 0) {
        // Several paragraphs in one item are kept as soft line breaks
        inlines.push({ type: 'text', text: '\n' });
      }
    }

    collectInlines(child, inlineContext, inlines);
  });

  output.push({ kind: 'list-item', item: { format, level, children: inlines } });
  output.push(...nested);
};

/**
 * Builds Strapi list nodes from a flat sequence of items with levels. A nested list is a `list`
 * child of its parent list, with `indentLevel` one higher (the shape the editor creates on Tab).
 */
const buildList = (items: PendingListItem[]): ListNode => {
  const baseLevel = Math.min(...items.map((item) => item.level));
  const root: ListNode = { type: 'list', format: items[0].format, indentLevel: 0, children: [] };
  const stack: { list: ListNode; level: number }[] = [{ list: root, level: baseLevel }];

  items.forEach((item) => {
    const children = normalizeInlines(item.children, false);
    const listItem: ListItemNode = {
      type: 'list-item',
      children: (children.length > 0
        ? children
        : [{ type: 'text', text: '' }]) as ListItemNode['children'],
    };

    while (stack.length > 1 && item.level < stack[stack.length - 1].level) {
      stack.pop();
    }

    let current = stack[stack.length - 1];

    // Only go one level deeper at a time, even if the source skips levels
    if (item.level > current.level) {
      const nested: ListNode = {
        type: 'list',
        format: item.format,
        indentLevel: (current.list.indentLevel ?? 0) + 1,
        children: [],
      };
      current.list.children.push(nested);
      current = { list: nested, level: item.level };
      stack.push(current);
    }

    current.list.children.push(listItem);
  });

  return root;
};

const toRootNodes = (collected: Collected[]): RootNode[] => {
  const nodes: RootNode[] = [];
  let pendingItems: PendingListItem[] = [];

  const flushList = () => {
    if (pendingItems.length === 0) return;

    // Top-level items with a different format start a new list
    let group: PendingListItem[] = [];
    const baseLevel = Math.min(...pendingItems.map((item) => item.level));

    pendingItems.forEach((item) => {
      if (group.length > 0 && item.level === baseLevel && item.format !== group[0].format) {
        nodes.push(buildList(group));
        group = [];
      }
      group.push(item);
    });

    if (group.length > 0) nodes.push(buildList(group));
    pendingItems = [];
  };

  collected.forEach((entry) => {
    if (entry.kind === 'list-item') {
      // Drop empty items, but keep their nested items
      if (hasText(normalizeInlines(entry.item.children, false))) {
        pendingItems.push(entry.item);
      }
      return;
    }

    flushList();
    nodes.push(entry.node);
  });

  flushList();

  return nodes;
};

/**
 * Above this many elements, converting would freeze the editor: the paste falls back to plain
 * text. A long article copied from Google Docs is a few thousand elements.
 */
const MAX_ELEMENTS = 50_000;

/**
 * Returns an empty array when the HTML can't be converted, so the caller pastes plain text.
 */
const deserializeHtml = (html: string): RootNode[] => {
  const document = new DOMParser().parseFromString(html, 'text/html');

  if (document.body.getElementsByTagName('*').length > MAX_ELEMENTS) {
    return [];
  }
  const collected: Collected[] = [];

  collectBlocks(document.body, { modifiers: {}, inQuote: false }, collected, 0);

  return toRootNodes(collected);
};

export { deserializeHtml };
