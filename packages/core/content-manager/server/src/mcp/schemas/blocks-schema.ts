import { z } from '@strapi/utils';

// ---------------------------------------------------------------------------
// Inline nodes
// ---------------------------------------------------------------------------

const textNodeSchema = z
  .object({
    type: z.literal('text'),
    text: z.string().describe('The text content.'),
    bold: z.boolean().optional(),
    italic: z.boolean().optional(),
    underline: z.boolean().optional(),
    strikethrough: z.boolean().optional(),
    code: z.boolean().optional(),
  })
  .describe('A text node with optional formatting marks.');

const linkNodeSchema = z
  .object({
    type: z.literal('link'),
    url: z.string().describe('The URL the link points to.'),
    children: z.array(textNodeSchema).min(1),
  })
  .describe('An inline link node. Children must be text nodes.');

const inlineNodeSchema = z.discriminatedUnion('type', [textNodeSchema, linkNodeSchema]);

// ---------------------------------------------------------------------------
// Root block nodes
// ---------------------------------------------------------------------------

const paragraphSchema = z.object({
  type: z.literal('paragraph'),
  children: z.array(inlineNodeSchema).min(1),
});

const headingSchema = z.object({
  type: z.literal('heading'),
  level: z.union([
    z.literal(1),
    z.literal(2),
    z.literal(3),
    z.literal(4),
    z.literal(5),
    z.literal(6),
  ]),
  children: z.array(inlineNodeSchema).min(1),
});

const quoteSchema = z.object({
  type: z.literal('quote'),
  children: z.array(inlineNodeSchema).min(1),
});

const codeSchema = z.object({
  type: z.literal('code'),
  language: z
    .string()
    .nullable()
    .optional()
    .describe('Programming language identifier (e.g. "javascript", "python").'),
  children: z.array(textNodeSchema).min(1),
});

// ---------------------------------------------------------------------------
// List nodes (recursive via z.lazy — mirrors yup.lazy in blocks-validator.ts)
// ---------------------------------------------------------------------------

const listItemSchema = z.object({
  type: z.literal('list-item'),
  children: z.array(inlineNodeSchema).min(1),
});

// ZodType annotation is required because of the self-reference via z.lazy
const listSchema: z.ZodType = z.object({
  type: z.literal('list'),
  format: z.enum(['ordered', 'unordered']),
  indentLevel: z.number().optional(),
  children: z
    .array(z.lazy(() => z.union([listItemSchema, listSchema])))
    .min(1)
    .describe('Children must be list-item or nested list nodes.'),
});

// ---------------------------------------------------------------------------
// Image block
// ---------------------------------------------------------------------------

const imageSchema = z.object({
  type: z.literal('image'),
  image: z
    .object({
      name: z.string(),
      alternativeText: z.string().nullable().optional(),
      url: z.string(),
      caption: z.string().nullable().optional(),
      width: z.number(),
      height: z.number(),
      formats: z.record(z.string(), z.unknown()).nullable().optional(),
      hash: z.string(),
      ext: z.string(),
      mime: z.string(),
      size: z.number(),
      previewUrl: z.string().nullable().optional(),
      provider: z.string(),
      provider_metadata: z.unknown().nullable().optional(),
      createdAt: z.string(),
      updatedAt: z.string(),
    })
    .describe(
      'An existing media asset. Use media tools to retrieve this data — MCP cannot upload files.'
    ),
  children: z.array(z.object({ type: z.literal('text'), text: z.literal('') })).length(1),
});

// ---------------------------------------------------------------------------
// Top-level schema
// ---------------------------------------------------------------------------

const blockNodeSchema = z.discriminatedUnion('type', [
  paragraphSchema,
  headingSchema,
  quoteSchema,
  codeSchema,
  imageSchema,
]);

/**
 * Returns the Zod schema for a Strapi Blocks (rich-text) field input.
 * Accepts an array of block nodes — paragraph, heading, quote, code, image, and list —
 * matching Strapi's internal blocks data model.
 */
export const buildBlocksInputSchema = (): z.ZodArray<z.ZodTypeAny> =>
  z
    .array(
      // listSchema uses z.lazy so it cannot participate in discriminatedUnion;
      // use a regular union to merge it back in.
      z.union([blockNodeSchema, listSchema])
    )
    .describe('An array of block nodes representing structured rich text content.');
