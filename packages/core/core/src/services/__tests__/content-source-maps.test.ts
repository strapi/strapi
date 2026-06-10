import { vercelStegaDecode } from '@vercel/stega';

import {
  createContentSourceMapsService,
  encodeBlocks,
  type BlocksEncodeMetadata,
} from '../content-source-maps';

const FIELD_PATH = 'body';

const baseMetadata: BlocksEncodeMetadata = {
  fieldPath: FIELD_PATH,
  documentId: 'doc-1',
  locale: 'en',
  kind: 'collectionType',
  model: 'api::article.article',
};

const decodeSourceParams = (value: string) => {
  const decoded = vercelStegaDecode(value);

  if (!decoded || !('strapiSource' in decoded)) {
    return null;
  }

  return new URLSearchParams(decoded.strapiSource as string);
};

const mockEncodeField = (
  text: string,
  metadata: { path: string; type: string; fieldPath?: string; documentId: string }
) => {
  const strapiSource = new URLSearchParams();
  strapiSource.set('documentId', metadata.documentId);
  strapiSource.set('type', metadata.type);
  strapiSource.set('path', metadata.path);
  if (metadata.model) strapiSource.set('model', metadata.model);
  if (metadata.kind) strapiSource.set('kind', metadata.kind);
  if (metadata.locale) strapiSource.set('locale', metadata.locale);
  if (metadata.fieldPath) strapiSource.set('fieldPath', metadata.fieldPath);
  return `${text}[${strapiSource.toString()}]`;
};

const isEncodedString = (value: string) =>
  decodeSourceParams(value) !== null || value.includes('[documentId=');

const collectEncodedStrings = (value: unknown, out: string[] = []): string[] => {
  if (typeof value === 'string') {
    if (isEncodedString(value)) {
      out.push(value);
    }
    return out;
  }

  if (Array.isArray(value)) {
    value.forEach((item) => collectEncodedStrings(item, out));
    return out;
  }

  if (value && typeof value === 'object') {
    Object.values(value).forEach((item) => collectEncodedStrings(item, out));
  }

  return out;
};

describe('encodeBlocks (pure encoder)', () => {
  test('encodes the first text leaf of a single paragraph only', () => {
    const blocks = [
      {
        type: 'paragraph',
        children: [
          { type: 'text', text: 'First line' },
          { type: 'text', text: 'Second line', bold: true },
        ],
      },
    ];

    const encoded = encodeBlocks(blocks, baseMetadata, mockEncodeField) as typeof blocks;

    expect(encoded[0].children[0].text).toContain('First line');
    expect(encoded[0].children[0].text).toContain(`path=${FIELD_PATH}`);
    expect(encoded[0].children[1].text).toBe('Second line');
  });

  test('encodes the first text leaf of each top-level paragraph', () => {
    const blocks = [
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Paragraph one' }],
      },
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Paragraph two' }],
      },
    ];

    const encoded = encodeBlocks(blocks, baseMetadata, mockEncodeField) as typeof blocks;
    const encodedStrings = collectEncodedStrings(encoded);

    expect(encodedStrings).toHaveLength(2);
    encodedStrings.forEach((value) => {
      expect(value).toContain(`path=${FIELD_PATH}`);
      expect(value).toContain(`fieldPath=${FIELD_PATH}`);
    });
  });

  test('encodes headings at every level using the first text leaf', () => {
    const blocks = [1, 2, 3, 4, 5, 6].map((level) => ({
      type: 'heading',
      level,
      children: [{ type: 'text', text: `heading ${level}` }],
    }));

    const encoded = encodeBlocks(blocks, baseMetadata, mockEncodeField) as typeof blocks;

    expect(collectEncodedStrings(encoded)).toHaveLength(6);
    encoded.forEach((block, index) => {
      expect(block.children[0].text).toContain(`heading ${index + 1}`);
    });
  });

  test('encodes the first text leaf of a quote block', () => {
    const blocks = [
      {
        type: 'quote',
        children: [{ type: 'text', text: 'Some ancient wisdom' }],
      },
    ];

    const encoded = encodeBlocks(blocks, baseMetadata, mockEncodeField) as typeof blocks;

    expect(encoded[0].children[0].text).toContain('Some ancient wisdom');
    expect(encoded[0].children[0].text).toContain(`fieldPath=${FIELD_PATH}`);
  });

  test('encodes the first text leaf of each list item in flat lists', () => {
    const blocks = [
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
        children: [
          { type: 'list-item', children: [{ type: 'text', text: 'Alpha' }] },
          { type: 'list-item', children: [{ type: 'text', text: 'Beta' }] },
        ],
      },
    ];

    const encoded = encodeBlocks(blocks, baseMetadata, mockEncodeField) as typeof blocks;

    expect(collectEncodedStrings(encoded)).toHaveLength(4);
    expect(encoded[0].children[0].children[0].text).toContain('First item');
    expect(encoded[0].children[1].children[0].children[0].text).toContain('Second item');
    expect(encoded[1].children[0].children[0].text).toContain('Alpha');
    expect(encoded[1].children[1].children[0].text).toContain('Beta');
  });

  test('encodes nested list items including nested lists', () => {
    const blocks = [
      {
        type: 'list',
        format: 'unordered',
        children: [
          { type: 'list-item', children: [{ type: 'text', text: 'Outer item' }] },
          {
            type: 'list',
            format: 'ordered',
            children: [{ type: 'list-item', children: [{ type: 'text', text: 'Nested item' }] }],
          },
        ],
      },
    ];

    const encoded = encodeBlocks(blocks, baseMetadata, mockEncodeField) as typeof blocks;

    expect(collectEncodedStrings(encoded)).toHaveLength(2);
    expect(encoded[0].children[0].children[0].text).toContain('Outer item');
    expect(encoded[0].children[1].children[0].children[0].text).toContain('Nested item');
  });

  test('encodes image url and alternativeText with the blocks field path', () => {
    const blocks = [
      {
        type: 'image',
        children: [{ type: 'text', text: '' }],
        image: {
          url: '/uploads/photo.png',
          alternativeText: 'Hero image',
        },
      },
    ];

    const encoded = encodeBlocks(blocks, baseMetadata, mockEncodeField) as typeof blocks;

    expect(encoded[0].image.url).toContain('/uploads/photo.png');
    expect(encoded[0].image.url).toContain(`path=${FIELD_PATH}`);
    expect(encoded[0].image.alternativeText).toContain('Hero image');
    expect(encoded[0].image.alternativeText).toContain(`fieldPath=${FIELD_PATH}`);
  });

  test('leaves code blocks unchanged', () => {
    const blocks = [
      {
        type: 'code',
        language: 'javascript',
        children: [{ type: 'text', text: '<SomeComponent />' }],
      },
    ];

    const encoded = encodeBlocks(blocks, baseMetadata, mockEncodeField) as typeof blocks;

    expect(encoded[0]).toBe(blocks[0]);
    expect(collectEncodedStrings(encoded)).toHaveLength(0);
  });

  test('handles mixed ASTs and keeps non-encoded nodes intact', () => {
    const blocks = [
      {
        type: 'paragraph',
        children: [{ type: 'text', text: 'Intro' }],
      },
      {
        type: 'code',
        children: [{ type: 'text', text: 'console.log("hi")' }],
      },
      {
        type: 'image',
        children: [{ type: 'text', text: '' }],
        image: { url: '/uploads/a.png' },
      },
      {
        type: 'list',
        format: 'ordered',
        children: [{ type: 'list-item', children: [{ type: 'text', text: 'Item' }] }],
      },
    ];

    const encoded = encodeBlocks(blocks, baseMetadata, mockEncodeField) as typeof blocks;

    expect(collectEncodedStrings(encoded)).toHaveLength(3);
    expect(encoded[1].children[0].text).toBe('console.log("hi")');
    expect(encoded[2].image.url).toContain('/uploads/a.png');
  });

  test('returns empty arrays unchanged', () => {
    expect(encodeBlocks([], baseMetadata, mockEncodeField)).toEqual([]);
  });

  test('does not encode when the blocks value is not an array', () => {
    expect(encodeBlocks(null, baseMetadata, mockEncodeField)).toBeNull();
  });

  test('encodes deeply nested inline content using the first text leaf only', () => {
    const blocks = [
      {
        type: 'paragraph',
        children: [
          {
            type: 'link',
            url: 'https://strapi.io',
            children: [{ type: 'text', text: 'Read more' }],
          },
          { type: 'text', text: ' trailing text' },
        ],
      },
    ];

    const encoded = encodeBlocks(blocks, baseMetadata, mockEncodeField) as typeof blocks;

    expect(encoded[0].children[0].children[0].text).toContain('Read more');
    expect(encoded[0].children[1].text).toBe(' trailing text');
    expect(collectEncodedStrings(encoded)).toHaveLength(1);
  });
});

describe('Content source maps service — blocks', () => {
  const articleSchema = {
    uid: 'api::article.article',
    kind: 'collectionType',
    attributes: {
      title: { type: 'string' },
      body: { type: 'blocks' },
    },
  };

  const strapi = {
    getModel: jest.fn((uid) => {
      if (uid === articleSchema.uid) {
        return articleSchema;
      }
      throw new Error(`Unknown model: ${uid}`);
    }),
    log: { error: jest.fn() },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('encodes one marker per visual block with path and fieldPath set to the blocks field', async () => {
    const service = createContentSourceMapsService(strapi);
    const data = {
      documentId: 'doc-1',
      locale: 'en',
      title: 'Article title',
      body: [
        {
          type: 'paragraph',
          children: [
            { type: 'text', text: 'First line' },
            {
              type: 'link',
              url: 'https://strapi.io',
              children: [{ type: 'text', text: 'Read more' }],
            },
          ],
        },
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'Second paragraph' }],
        },
      ],
    };

    const encoded = await service.encodeSourceMaps({ data, schema: articleSchema as any });

    expect(encoded.body[0].children[1].url).toBe('https://strapi.io');
    expect(encoded.body[0].children[1].children[0].text).toBe('Read more');

    const encodedTitle = decodeSourceParams(encoded.title);
    expect(encodedTitle?.get('path')).toBe('title');
    expect(encodedTitle?.get('type')).toBe('string');
    expect(encodedTitle?.get('fieldPath')).toBeNull();

    const encodedStrings = collectEncodedStrings(encoded.body);
    expect(encodedStrings).toHaveLength(2);

    encodedStrings.forEach((value) => {
      const params = decodeSourceParams(value);
      expect(params?.get('path')).toBe('body');
      expect(params?.get('fieldPath')).toBe('body');
      expect(params?.get('type')).toBe('blocks');
      expect(params?.get('documentId')).toBe('doc-1');
      expect(params?.get('locale')).toBe('en');
      expect(params?.get('model')).toBe('api::article.article');
    });
  });

  test('leaves non-text properties on encoded text nodes intact', async () => {
    const service = createContentSourceMapsService(strapi);
    const data = {
      documentId: 'doc-1',
      body: [
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'Bold', bold: true }],
        },
      ],
    };

    const encoded = await service.encodeSourceMaps({ data, schema: articleSchema as any });
    expect(encoded.body[0].children[0].bold).toBe(true);
    expect(encoded.body[0].children[0].type).toBe('text');
    expect(typeof encoded.body[0].children[0].text).toBe('string');
    expect(decodeSourceParams(encoded.body[0].children[0].text)?.get('path')).toBe('body');
  });

  test('does not encode blocks when value is not an array', async () => {
    const service = createContentSourceMapsService(strapi);
    const data = {
      documentId: 'doc-1',
      body: null,
    };

    const encoded = await service.encodeSourceMaps({ data, schema: articleSchema as any });
    expect(encoded.body).toBeNull();
  });

  test('does not encode json fields with a blocks-like shape', async () => {
    const service = createContentSourceMapsService(strapi);
    const schemaWithJson = {
      uid: 'api::article.article',
      kind: 'collectionType',
      attributes: {
        content: { type: 'json' },
      },
    };
    const data = {
      documentId: 'doc-2',
      content: [
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'Should not be encoded' }],
        },
      ],
    };

    const encoded = await service.encodeSourceMaps({ data, schema: schemaWithJson as any });
    expect(encoded.content[0].children[0].text).toBe('Should not be encoded');
  });

  test('skips code blocks during service encoding', async () => {
    const service = createContentSourceMapsService(strapi);
    const data = {
      documentId: 'doc-1',
      body: [
        {
          type: 'code',
          language: 'javascript',
          children: [{ type: 'text', text: 'const x = 1;' }],
        },
      ],
    };

    const encoded = await service.encodeSourceMaps({ data, schema: articleSchema as any });
    expect(encoded.body[0].children[0].text).toBe('const x = 1;');
    expect(collectEncodedStrings(encoded.body)).toHaveLength(0);
  });
});
