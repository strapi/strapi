import { vercelStegaDecode } from '@vercel/stega';

import { createContentSourceMapsService } from '../content-source-maps';

const decodeSourceParams = (value: string) => {
  const decoded = vercelStegaDecode(value);

  if (!decoded || !('strapiSource' in decoded)) {
    return null;
  }

  return new URLSearchParams(decoded.strapiSource);
};

describe('Content source maps service', () => {
  const articleSchema = {
    uid: 'api::article.article',
    kind: 'collectionType',
    attributes: {
      title: { type: 'string' },
      body: { type: 'blocks' },
    },
  };

  const uploadFileSchema = {
    uid: 'plugin::upload.file',
    kind: 'collectionType',
    attributes: {
      url: { type: 'string' },
      mime: { type: 'string' },
      alternativeText: { type: 'string' },
    },
  };

  const articleWithMediaSchema = {
    uid: 'api::article-with-media.article-with-media',
    kind: 'collectionType',
    attributes: {
      title: { type: 'string' },
      singleMedia: { type: 'media' },
      multipleMedia: { type: 'media' },
    },
  };

  const strapi = {
    getModel: jest.fn((uid) => {
      if (uid === articleSchema.uid) {
        return articleSchema;
      }
      if (uid === articleWithMediaSchema.uid) {
        return articleWithMediaSchema;
      }
      if (uid === uploadFileSchema.uid) {
        return uploadFileSchema;
      }

      throw new Error(`Unknown model: ${uid}`);
    }),
    log: {
      error: jest.fn(),
    },
  } as any;

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('encodes blocks text nodes with stega metadata while preserving non-text fields', async () => {
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
              rel: 'noopener noreferrer',
              target: '_blank',
              children: [{ type: 'text', text: 'Read more' }],
            },
          ],
        },
      ],
    };

    const encoded = await service.encodeSourceMaps({ data, schema: articleSchema as any });
    const encodedTitle = decodeSourceParams(encoded.title);
    const encodedFirstText = decodeSourceParams(encoded.body[0].children[0].text);
    const encodedLinkText = decodeSourceParams(encoded.body[0].children[1].children[0].text);
    const encodedLinkUrl = decodeSourceParams(encoded.body[0].children[1].url);

    expect(encodedTitle?.get('path')).toBe('title');
    expect(encodedTitle?.get('type')).toBe('string');
    expect(encodedTitle?.get('fieldPath')).toBeNull();

    expect(encoded.body[0].type).toBe('paragraph');
    expect(encoded.body[0].children[1].type).toBe('link');
    expect(encoded.body[0].children[1].url).toBe('https://strapi.io');
    expect(encodedLinkUrl).toBeNull();

    expect(encodedFirstText?.get('path')).toBe('body.0.children.0.text');
    expect(encodedFirstText?.get('fieldPath')).toBe('body');
    expect(encodedFirstText?.get('type')).toBe('blocks');
    expect(encodedFirstText?.get('documentId')).toBe('doc-1');
    expect(encodedFirstText?.get('locale')).toBe('en');
    expect(encodedFirstText?.get('model')).toBe('api::article.article');

    expect(encodedLinkText?.get('path')).toBe('body.0.children.1.children.0.text');
    expect(encodedLinkText?.get('fieldPath')).toBe('body');
    expect(encodedLinkText?.get('type')).toBe('blocks');
  });

  test('encodes blocks-like json arrays as blocks text nodes', async () => {
    const service = createContentSourceMapsService(strapi);
    const schemaWithJsonBlocks = {
      ...articleSchema,
      attributes: {
        content: { type: 'json' },
      },
    };

    const data = {
      documentId: 'doc-2',
      content: [
        {
          type: 'paragraph',
          children: [{ type: 'text', text: 'Fallback blocks value' }],
        },
      ],
    };

    const encoded = await service.encodeSourceMaps({ data, schema: schemaWithJsonBlocks as any });
    const encodedText = decodeSourceParams(encoded.content[0].children[0].text);

    expect(encodedText?.get('path')).toBe('content.0.children.0.text');
    expect(encodedText?.get('fieldPath')).toBe('content');
    expect(encodedText?.get('type')).toBe('blocks');
  });
});
