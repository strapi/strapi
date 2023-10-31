import type { Attribute } from '..';

export type Blocks = Attribute.OfType<'blocks'> &
  // Options
  Attribute.ConfigurableOption &
  Attribute.PrivateOption &
  Attribute.RequiredOption &
  Attribute.WritableOption &
  Attribute.VisibleOption;

interface TextInlineNode {
  type: 'text';
  text: string;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  code?: boolean;
}

interface LinkInlineNode {
  type: 'link';
  url: string;
  children: TextInlineNode[];
}

interface ListItemInlineNode {
  type: 'list-item';
  children: DefaultInlineNode[];
}

type DefaultInlineNode = TextInlineNode | LinkInlineNode;

interface ParagraphBlockNode {
  type: 'paragraph';
  children: DefaultInlineNode[];
}

interface QuoteBlockNode {
  type: 'quote';
  children: DefaultInlineNode[];
}

interface CodeBlockNode {
  type: 'code';
  children: DefaultInlineNode[];
}

interface HeadingBlockNode {
  type: 'heading';
  level: 1 | 2 | 3 | 4 | 5 | 6;
  children: DefaultInlineNode[];
}

interface ListBlockNode {
  type: 'list';
  format: 'ordered' | 'unordered';
  children: (ListItemInlineNode | ListBlockNode)[];
}

interface ImageBlockNode {
  type: 'image';
  image: Attribute.GetValue<{
    type: 'media';
    allowedTypes: ['images'];
    multiple: false;
  }>;
  children: [{ type: 'text'; text: '' }];
}

// Block node types
type RootNode =
  | ParagraphBlockNode
  | QuoteBlockNode
  | CodeBlockNode
  | HeadingBlockNode
  | ListBlockNode
  | ImageBlockNode;

export type BlocksValue = RootNode[];

export type GetBlocksValue<T extends Attribute.Attribute> = T extends Blocks ? BlocksValue : never;
