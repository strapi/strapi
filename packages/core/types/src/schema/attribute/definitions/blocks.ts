import type { Intersect } from '../../../utils';
import type { Attribute } from '../..';

/**
 * Represents a block Strapi attribute along with its options
 */
export type Blocks = Intersect<
  [
    Attribute.OfType<'blocks'>,
    // Options
    Attribute.ConfigurableOption,
    Attribute.PrivateOption,
    Attribute.RequiredOption,
    Attribute.WritableOption,
    Attribute.VisibleOption,
  ]
>;

export type BlocksValue = RootNode[];

export type GetBlocksValue<T extends Attribute.Attribute> = T extends Blocks ? BlocksValue : never;

// Block node types
type RootNode =
  | ParagraphBlockNode
  | QuoteBlockNode
  | CodeBlockNode
  | HeadingBlockNode
  | ListBlockNode
  | ImageBlockNode;

// Type utils needed for the blocks renderer and the blocks editor
export type BlocksNode = RootNode | NonTextInlineNode;
export type BlocksInlineNode = NonTextInlineNode;
export type BlocksTextNode = TextInlineNode;

interface TextInlineNode {
  type: 'text';
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
}

interface BaseNode {
  type: string;
  children: unknown[];
}

export interface LinkInlineNode extends BaseNode {
  type: 'link';
  url: string;
  children: TextInlineNode[];
}

interface ListItemInlineNode extends BaseNode {
  type: 'list-item';
  children: DefaultInlineNode[];
}

type InlineNode = TextInlineNode | LinkInlineNode | ListItemInlineNode;

type DefaultInlineNode = Exclude<InlineNode, ListItemInlineNode>;
type NonTextInlineNode = Exclude<InlineNode, TextInlineNode>;

interface ParagraphBlockNode extends BaseNode {
  type: 'paragraph';
  children: DefaultInlineNode[];
}

interface QuoteBlockNode extends BaseNode {
  type: 'quote';
  children: DefaultInlineNode[];
}

interface CodeBlockNode extends BaseNode {
  type: 'code';
  language?: string;
  children: DefaultInlineNode[];
}

interface HeadingBlockNode extends BaseNode {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: DefaultInlineNode[];
}

export interface ListBlockNode extends BaseNode {
  type: 'list';
  format: 'ordered' | 'unordered';
  children: (ListItemInlineNode | ListBlockNode)[];
  indentLevel?: number;
}

interface ImageBlockNode extends BaseNode {
  type: 'image';
  image: Attribute.MediaValue<false>;
  children: [{ type: 'text'; text: '' }];
}
