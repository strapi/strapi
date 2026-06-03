import { z } from '@strapi/utils';

import { buildBlocksInputSchema } from '../schemas/blocks-schema';

const schema = buildBlocksInputSchema();

// ---------------------------------------------------------------------------
// Fixtures (mirrored from blocks-validators.test.ts for Yup/Zod parity)
// ---------------------------------------------------------------------------

const validParagraph = [
  {
    type: 'paragraph',
    children: [
      { type: 'text', text: 'test' },
      { type: 'text', text: '' },
      {
        type: 'text',
        text: 'plop',
        bold: true,
        italic: false,
        underline: true,
        strikethrough: false,
        code: true,
      },
      {
        type: 'link',
        url: 'https://strapi.io',
        children: [{ type: 'text', text: 'Strapi' }],
      },
    ],
  },
];

const validImage = [
  {
    type: 'image',
    children: [{ type: 'text', text: '' }],
    image: {
      name: 'screenshot.png',
      alternativeText: null,
      url: '/uploads/screenshot.png',
      caption: null,
      width: 665,
      height: 692,
      formats: {},
      hash: 'screenshot_abc123',
      ext: '.png',
      mime: 'image/png',
      size: 17.95,
      previewUrl: null,
      provider: 'local',
      provider_metadata: null,
      createdAt: '2023-08-24T09:43:30.065Z',
      updatedAt: '2023-08-24T09:43:30.065Z',
    },
  },
];

const validImageWithNullFormats = [
  {
    type: 'image',
    children: [{ type: 'text', text: '' }],
    image: { ...validImage[0].image, formats: null },
  },
];

const validQuote = [
  {
    type: 'quote',
    children: [
      { type: 'text', text: 'This is a quote' },
      {
        type: 'link',
        url: 'https://strapi.io',
        children: [{ type: 'text', text: 'Strapi' }],
      },
    ],
  },
];

const validHeadings = [
  { type: 'heading', level: 1, children: [{ type: 'text', text: 'Heading 1' }] },
  {
    type: 'heading',
    level: 6,
    children: [
      { type: 'link', url: 'https://strapi.io', children: [{ type: 'text', text: 'Heading 6' }] },
    ],
  },
];

const validLists = [
  {
    type: 'list',
    format: 'ordered',
    children: [
      { type: 'list-item', children: [{ type: 'text', text: 'First item' }] },
      {
        type: 'list-item',
        children: [
          {
            type: 'link',
            url: 'https://strapi.io',
            children: [{ type: 'text', text: 'Second item' }],
          },
        ],
      },
    ],
  },
  {
    type: 'list',
    format: 'unordered',
    children: [{ type: 'list-item', children: [{ type: 'text', text: 'First item' }] }],
  },
];

const validNestedList = [
  {
    type: 'list',
    format: 'unordered',
    children: [
      { type: 'list-item', children: [{ type: 'text', text: 'Top' }] },
      {
        type: 'list',
        format: 'ordered',
        indentLevel: 1,
        children: [{ type: 'list-item', children: [{ type: 'text', text: 'Nested' }] }],
      },
    ],
  },
];

const validCodeBlock = [
  {
    type: 'code',
    language: 'javascript',
    children: [{ type: 'text', text: 'const x = 1;' }],
  },
];

const validCodeBlockNoLanguage = [
  {
    type: 'code',
    children: [{ type: 'text', text: 'no language' }],
  },
];

const validCodeBlockNullLanguage = [
  {
    type: 'code',
    language: null,
    children: [{ type: 'text', text: 'null language' }],
  },
];

// ---------------------------------------------------------------------------
// Valid cases
// ---------------------------------------------------------------------------

describe('buildBlocksInputSchema — valid payloads', () => {
  it('parses a valid paragraph', () => {
    expect(() => schema.parse(validParagraph)).not.toThrow();
  });

  it('parses a valid image (with empty-object formats)', () => {
    expect(() => schema.parse(validImage)).not.toThrow();
  });

  it('parses a valid image with null formats', () => {
    expect(() => schema.parse(validImageWithNullFormats)).not.toThrow();
  });

  it('parses a valid quote', () => {
    expect(() => schema.parse(validQuote)).not.toThrow();
  });

  it('parses valid headings (levels 1 and 6)', () => {
    expect(() => schema.parse(validHeadings)).not.toThrow();
  });

  it('parses valid ordered and unordered lists', () => {
    expect(() => schema.parse(validLists)).not.toThrow();
  });

  it('parses nested lists (recursive via z.lazy)', () => {
    expect(() => schema.parse(validNestedList)).not.toThrow();
  });

  it('parses a code block with a language', () => {
    expect(() => schema.parse(validCodeBlock)).not.toThrow();
  });

  it('parses a code block without language field', () => {
    expect(() => schema.parse(validCodeBlockNoLanguage)).not.toThrow();
  });

  it('parses a code block with null language', () => {
    expect(() => schema.parse(validCodeBlockNullLanguage)).not.toThrow();
  });

  it('parses a mixed array of all block types', () => {
    const mixed = [
      ...validParagraph,
      ...validImage,
      ...validQuote,
      ...validHeadings,
      ...validLists,
      ...validCodeBlock,
    ];
    expect(() => schema.parse(mixed)).not.toThrow();
  });
});

// ---------------------------------------------------------------------------
// Invalid cases
// ---------------------------------------------------------------------------

describe('buildBlocksInputSchema — invalid payloads', () => {
  it('rejects a paragraph without children', () => {
    expect(() => schema.parse([{ type: 'paragraph' }])).toThrow();
  });

  it('rejects a paragraph with empty children array', () => {
    expect(() => schema.parse([{ type: 'paragraph', children: [] }])).toThrow();
  });

  it('rejects a heading with invalid level (8)', () => {
    expect(() =>
      schema.parse([{ type: 'heading', level: 8, children: [{ type: 'text', text: 'H8' }] }])
    ).toThrow();
  });

  it('rejects a list with invalid format', () => {
    expect(() =>
      schema.parse([
        {
          type: 'list',
          format: 'bad',
          children: [{ type: 'list-item', children: [{ type: 'text', text: 'x' }] }],
        },
      ])
    ).toThrow();
  });

  it('rejects a list with non-list-item / non-list child', () => {
    expect(() =>
      schema.parse([
        {
          type: 'list',
          format: 'ordered',
          children: [{ type: 'paragraph', children: [{ type: 'text', text: 'x' }] }],
        },
      ])
    ).toThrow();
  });

  it('rejects a code block with a link child (text-only constraint)', () => {
    expect(() =>
      schema.parse([
        {
          type: 'code',
          language: 'js',
          children: [
            { type: 'link', url: 'https://strapi.io', children: [{ type: 'text', text: 'x' }] },
          ],
        },
      ])
    ).toThrow();
  });

  it('rejects an image block with a missing required field (url)', () => {
    expect(() =>
      schema.parse([
        {
          type: 'image',
          children: [{ type: 'text', text: '' }],
          image: {
            name: 'test.png',
            // url is missing
            width: 100,
            height: 100,
            hash: 'abc',
            ext: '.png',
            mime: 'image/png',
            size: 1,
            provider: 'local',
            createdAt: '2023-01-01T00:00:00Z',
            updatedAt: '2023-01-01T00:00:00Z',
          },
        },
      ])
    ).toThrow();
  });

  it('rejects a completely unknown block type', () => {
    expect(() => schema.parse([{ type: 'unknown-block', children: [] }])).toThrow();
  });
});

// ---------------------------------------------------------------------------
// JSON Schema shape (documents MCP advertisement with $ref/$defs)
// ---------------------------------------------------------------------------

describe('buildBlocksInputSchema — JSON Schema shape', () => {
  it('contains $ref and $defs due to z.lazy (expected for MCP advertisement)', () => {
    const jsonSchema = JSON.stringify(z.toJSONSchema(schema));
    // z.lazy produces $ref/$defs; this documents the expected output shape
    expect(jsonSchema).toContain('$ref');
  });
});
