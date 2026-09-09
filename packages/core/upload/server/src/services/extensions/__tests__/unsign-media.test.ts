import type { UID } from '@strapi/types';
import extensions from '..';
import { unsignEntityMedia } from '../utils';
import { getService } from '../../../utils';

jest.mock('../../../utils');

const BUCKET_URL = 'https://my-bucket.s3.eu-west-1.amazonaws.com';

const modelUID = 'model' as UID.Schema;
const componentUID = 'component';

const models = {
  [modelUID]: {
    attributes: {
      media: { type: 'media', multiple: false },
      richtext: { type: 'richtext' },
      blocks: { type: 'blocks' },
      compo: { type: 'component', component: componentUID },
      dynamicZone: { type: 'dynamiczone', components: [componentUID] },
    },
  },
  [componentUID]: {
    attributes: {
      richtext: { type: 'richtext' },
      blocks: { type: 'blocks' },
    },
  },
} as const;

/**
 * Mimics the real `signFileUrls`: `isUrlSigned` is set for every file of the
 * configured private provider, but the provider itself only rewrites URLs from
 * its own bucket and hands every other URL back untouched. The signature
 * replaces any query string already there.
 */
const signFileUrls = jest.fn(async (file: any) => {
  const isOwned = (url: string) => url.startsWith(BUCKET_URL);
  const sign = (url: string) => (isOwned(url) ? `${url.split('?')[0]}?signature=fresh` : url);
  const signed = { ...file, isUrlSigned: false };

  if (file.provider !== 'aws-s3') {
    return signed;
  }

  signed.isUrlSigned = true;
  signed.url = sign(file.url);

  if (file.formats) {
    signed.formats = Object.fromEntries(
      Object.entries(file.formats).map(([key, format]: [string, any]) => [
        key,
        { ...format, url: sign(format.url) },
      ])
    );
  }

  return signed;
});

const imageNode = (url: string, overrides: Record<string, unknown> = {}) => ({
  type: 'image',
  image: {
    name: 'photo.png',
    hash: 'photo_abc123',
    ext: '.png',
    provider: 'aws-s3',
    url,
    formats: {
      thumbnail: { url: `${BUCKET_URL}/thumbnail_photo_abc123.png?X-Amz-Signature=expired` },
    },
    isUrlSigned: true,
    ...overrides,
  },
  children: [{ type: 'text', text: '' }],
});

const setupStrapi = ({ isPrivate = true }: { isPrivate?: boolean } = {}) => {
  global.strapi = {
    plugins: { upload: { provider: { isPrivate: jest.fn().mockResolvedValue(isPrivate) } } },
    documents: { use: jest.fn() },
    config: { get: jest.fn(() => ({ provider: 'aws-s3' })) },
    getModel: jest.fn((uid: keyof typeof models) => models[uid]),
  } as any;
};

describe('Upload | extensions | unsign media', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.mocked(getService).mockImplementation(() => ({ signFileUrls }) as any);
    setupStrapi();
  });

  describe('unsignEntityMedia', () => {
    test('strips the signature from a richtext url owned by the provider', async () => {
      const data = {
        richtext: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=abc&X-Amz-Expires=900)`,
      };

      const result: any = await unsignEntityMedia(data, modelUID);

      expect(result.richtext).toBe(`![alt](${BUCKET_URL}/photo_abc123.png)`);
    });

    test('leaves external urls and their query string untouched', async () => {
      const data = { richtext: '![alt](https://example.com/photo.png?width=200)' };

      const result: any = await unsignEntityMedia(data, modelUID);

      expect(result.richtext).toBe('![alt](https://example.com/photo.png?width=200)');
    });

    test('leaves local urls and their query string untouched', async () => {
      const data = { richtext: '![alt](/uploads/photo.png?v=1)' };

      const result: any = await unsignEntityMedia(data, modelUID);

      expect(result.richtext).toBe('![alt](/uploads/photo.png?v=1)');
    });

    test('strips the signature from raw html src and href urls owned by the provider', async () => {
      const data = {
        richtext:
          `<img src="${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired" width="200">\n` +
          `<a href='${BUCKET_URL}/doc_abc123.pdf?X-Amz-Signature=expired'>doc</a>\n` +
          '<img src="https://example.com/x.png?w=1">',
      };

      const result: any = await unsignEntityMedia(data, modelUID);

      expect(result.richtext).toBe(
        `<img src="${BUCKET_URL}/photo_abc123.png" width="200">\n` +
          `<a href='${BUCKET_URL}/doc_abc123.pdf'>doc</a>\n` +
          '<img src="https://example.com/x.png?w=1">'
      );
    });

    test('strips the signature from a blocks image, its formats and drops isUrlSigned', async () => {
      const data = {
        blocks: [imageNode(`${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=abc`)],
      };

      const result: any = await unsignEntityMedia(data, modelUID);

      expect(result.blocks[0].image.url).toBe(`${BUCKET_URL}/photo_abc123.png`);
      expect(result.blocks[0].image.formats.thumbnail.url).toBe(
        `${BUCKET_URL}/thumbnail_photo_abc123.png`
      );
      expect(result.blocks[0].image).not.toHaveProperty('isUrlSigned');
    });

    test('leaves blocks images from another provider untouched', async () => {
      const data = {
        blocks: [
          imageNode('https://example.com/photo_abc123.png?v=1', {
            provider: 'local',
            formats: undefined,
          }),
        ],
      };

      const result: any = await unsignEntityMedia(data, modelUID);

      expect(result.blocks[0].image.url).toBe('https://example.com/photo_abc123.png?v=1');
    });

    test('leaves media attributes untouched', async () => {
      const media = { url: `${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=abc` };

      const result: any = await unsignEntityMedia({ media }, modelUID);

      expect(result.media).toEqual(media);
    });

    test('handles richtext and blocks nested in components and dynamic zones', async () => {
      const data = {
        compo: { richtext: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=abc)` },
        dynamicZone: [
          {
            __component: componentUID,
            blocks: [imageNode(`${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=abc`)],
          },
        ],
      };

      const result: any = await unsignEntityMedia(data, modelUID);

      expect(result.compo.richtext).toBe(`![alt](${BUCKET_URL}/photo_abc123.png)`);
      expect(result.dynamicZone[0].blocks[0].image.url).toBe(`${BUCKET_URL}/photo_abc123.png`);
    });
  });

  describe('signFileUrlsOnDocumentService middleware', () => {
    const getMiddleware = async () => {
      await extensions.signFileUrlsOnDocumentService();

      return jest.mocked(global.strapi.documents.use).mock.calls[0][0];
    };

    test('persists an unsigned url and returns a signed one on create', async () => {
      const middleware = await getMiddleware();

      const ctx: any = {
        uid: modelUID,
        action: 'create',
        params: {
          data: {
            richtext: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)`,
          },
        },
      };

      // The document service persists `ctx.params.data`, so assert on what it holds
      const next = jest.fn(async () => ({ ...ctx.params.data }));
      const result: any = await middleware(ctx, next);

      expect(ctx.params.data.richtext).toBe(`![alt](${BUCKET_URL}/photo_abc123.png)`);
      expect(result.richtext).toBe(`![alt](${BUCKET_URL}/photo_abc123.png?signature=fresh)`);
    });

    test('normalises blocks on update', async () => {
      const middleware = await getMiddleware();

      const ctx: any = {
        uid: modelUID,
        action: 'update',
        params: {
          data: { blocks: [imageNode(`${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired`)] },
        },
      };

      const next = jest.fn(async () => ({ ...ctx.params.data }));
      await middleware(ctx, next);

      expect(ctx.params.data.blocks[0].image.url).toBe(`${BUCKET_URL}/photo_abc123.png`);
    });

    test('does not touch the data of a read action', async () => {
      const middleware = await getMiddleware();

      const richtext = `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)`;
      const ctx: any = { uid: modelUID, action: 'findOne', params: { data: { richtext } } };

      const next: any = jest.fn(async () => ({}));
      await middleware(ctx, next);

      expect(ctx.params.data.richtext).toBe(richtext);
    });

    test('registers nothing when the provider is public', async () => {
      setupStrapi({ isPrivate: false });

      await extensions.signFileUrlsOnDocumentService();

      expect(global.strapi.documents.use).not.toHaveBeenCalled();
    });
  });
});
