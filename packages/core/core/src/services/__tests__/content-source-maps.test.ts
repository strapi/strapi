import { vercelStegaDecode } from '@vercel/stega';

import { createContentSourceMapsService } from '../content-source-maps';

const decodeSourceParams = (value: string) => {
  const decoded = vercelStegaDecode(value);

  if (!decoded || !('strapiSource' in decoded)) {
    return null;
  }

  return new URLSearchParams(decoded.strapiSource as string);
};

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

  test('encodes each text leaf with path=<leafPath> and fieldPath=<rootField>', async () => {
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
      ],
    };

    const encoded = await service.encodeSourceMaps({ data, schema: articleSchema as any });

    // Non-text fields are untouched
    expect(encoded.body[0].type).toBe('paragraph');
    expect(encoded.body[0].children[1].type).toBe('link');
    expect(encoded.body[0].children[1].url).toBe('https://strapi.io');

    // String field uses the existing schema (no fieldPath)
    const encodedTitle = decodeSourceParams(encoded.title);
    expect(encodedTitle?.get('path')).toBe('title');
    expect(encodedTitle?.get('type')).toBe('string');
    expect(encodedTitle?.get('fieldPath')).toBeNull();

    // Top-level text leaf
    const encodedFirstText = decodeSourceParams(encoded.body[0].children[0].text);
    expect(encodedFirstText?.get('path')).toBe('body.0.children.0.text');
    expect(encodedFirstText?.get('fieldPath')).toBe('body');
    expect(encodedFirstText?.get('type')).toBe('blocks');
    expect(encodedFirstText?.get('documentId')).toBe('doc-1');
    expect(encodedFirstText?.get('locale')).toBe('en');
    expect(encodedFirstText?.get('model')).toBe('api::article.article');

    // Nested text leaf (inside link)
    const encodedLinkText = decodeSourceParams(encoded.body[0].children[1].children[0].text);
    expect(encodedLinkText?.get('path')).toBe('body.0.children.1.children.0.text');
    expect(encodedLinkText?.get('fieldPath')).toBe('body');
    expect(encodedLinkText?.get('type')).toBe('blocks');
  });

  test('leaves non-text properties on text nodes alone', async () => {
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
});
