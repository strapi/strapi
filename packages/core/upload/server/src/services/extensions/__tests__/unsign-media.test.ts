import type { UID } from '@strapi/types';
import extensions from '..';
import { unsignEntityMedia } from '../utils';
import { getService } from '../../../utils';

jest.mock('../../../utils');

const BUCKET_URL = 'https://my-bucket.s3.eu-west-1.amazonaws.com';
const FRESH_SIGNATURE = 'X-Amz-Signature=fresh&X-Amz-Expires=900';

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
 * Builds a fake `signFileUrls`: `isUrlSigned` is set for every file of the
 * configured private provider, on the file and on each format, and `isOwned`
 * decides which URLs the provider rewrites. The signature replaces any query
 * string already there, as the S3 presigner does.
 */
const createSignFileUrls = (isOwned: (url: string) => boolean) =>
  jest.fn(async (file: any) => {
    const sign = (url: string) => (isOwned(url) ? `${url.split('?')[0]}?${FRESH_SIGNATURE}` : url);
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
          { ...format, url: sign(format.url), isUrlSigned: true },
        ])
      );
    }

    return signed;
  });

/**
 * Mimics the real S3 provider: only URLs from its own bucket are rewritten,
 * every other URL is handed back untouched.
 */
const signFileUrls = createSignFileUrls((url) => url.startsWith(`${BUCKET_URL}/`));

const imageNode = (url: string, overrides: Record<string, unknown> = {}) => ({
  type: 'image',
  image: {
    name: 'photo.png',
    hash: 'photo_abc123',
    ext: '.png',
    provider: 'aws-s3',
    url,
    formats: {
      thumbnail: {
        url: `${BUCKET_URL}/thumbnail_photo_abc123.png?X-Amz-Signature=expired`,
        isUrlSigned: true,
      },
    },
    isUrlSigned: true,
    ...overrides,
  },
  children: [{ type: 'text', text: '' }],
});

/** An image node as the fix leaves it in the row: no signature and no flag anywhere. */
const bareImageNode = (
  formats: Record<string, unknown> = {
    thumbnail: { url: `${BUCKET_URL}/thumbnail_photo_abc123.png` },
  }
) => {
  const node = imageNode(`${BUCKET_URL}/photo_abc123.png`, { formats });
  delete (node.image as Partial<typeof node.image>).isUrlSigned;

  return node;
};

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

    test('removes only the signature parameters and keeps the others', async () => {
      const data = {
        richtext: `![alt](${BUCKET_URL}/photo_abc123.png?width=200&X-Amz-Signature=old&X-Amz-Expires=900&h=1)`,
      };

      const result: any = await unsignEntityMedia(data, modelUID);

      expect(result.richtext).toBe(`![alt](${BUCKET_URL}/photo_abc123.png?width=200&h=1)`);
    });

    test('keeps the fragment of a signed url', async () => {
      const data = {
        richtext: `[doc](${BUCKET_URL}/doc_abc123.pdf?X-Amz-Signature=old#page=2)`,
      };

      const result: any = await unsignEntityMedia(data, modelUID);

      expect(result.richtext).toBe(`[doc](${BUCKET_URL}/doc_abc123.pdf#page=2)`);
    });

    test('does not lose query parameters of an external url even when the provider signs anything', async () => {
      // A third party private provider whose `getSignedUrl` signs whatever it receives
      jest
        .mocked(getService)
        .mockImplementation(() => ({ signFileUrls: createSignFileUrls(() => true) }) as any);

      const data = {
        richtext: `[video](https://example.com/video?v=x) ![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=old)`,
      };

      const result: any = await unsignEntityMedia(data, modelUID);

      expect(result.richtext).toBe(
        `[video](https://example.com/video?v=x) ![alt](${BUCKET_URL}/photo_abc123.png)`
      );
    });

    test('does not call the provider for a richtext url without a query string', async () => {
      const data = { richtext: `![alt](${BUCKET_URL}/photo_abc123.png)` };

      const result: any = await unsignEntityMedia(data, modelUID);

      expect(result.richtext).toBe(`![alt](${BUCKET_URL}/photo_abc123.png)`);
      expect(signFileUrls).not.toHaveBeenCalled();
    });

    test('does not call the provider for a blocks image that is already bare', async () => {
      const bare = bareImageNode();

      const result: any = await unsignEntityMedia({ blocks: [bare] }, modelUID);

      expect(result.blocks[0].image).toEqual(bare.image);
      expect(signFileUrls).not.toHaveBeenCalled();
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

      const { image } = result.blocks[0];
      expect(image.url).toBe(`${BUCKET_URL}/photo_abc123.png`);
      expect(image.formats.thumbnail.url).toBe(`${BUCKET_URL}/thumbnail_photo_abc123.png`);
      expect(image).not.toHaveProperty('isUrlSigned');
      expect(image.formats.thumbnail).not.toHaveProperty('isUrlSigned');
    });

    test('drops isUrlSigned from a format even when its url is already bare', async () => {
      // The state an earlier version of the fix left behind
      const data = {
        blocks: [
          bareImageNode({
            thumbnail: { url: `${BUCKET_URL}/thumbnail_photo_abc123.png`, isUrlSigned: true },
          }),
        ],
      };

      const result: any = await unsignEntityMedia(data, modelUID);

      expect(result.blocks[0].image.formats.thumbnail).toEqual({
        url: `${BUCKET_URL}/thumbnail_photo_abc123.png`,
      });
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
      expect(result.richtext).toBe(`![alt](${BUCKET_URL}/photo_abc123.png?${FRESH_SIGNATURE})`);
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

    test('normalises the submitted data on clone', async () => {
      const middleware = await getMiddleware();

      const ctx: any = {
        uid: modelUID,
        action: 'clone',
        params: {
          data: {
            richtext: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)`,
          },
        },
      };

      // `clone` merges the submitted data over the source row and returns { entries }
      const next: any = jest.fn(async () => ({ entries: [{ ...ctx.params.data }] }));
      const result: any = await middleware(ctx, next);

      expect(ctx.params.data.richtext).toBe(`![alt](${BUCKET_URL}/photo_abc123.png)`);
      expect(result.entries[0].richtext).toBe(
        `![alt](${BUCKET_URL}/photo_abc123.png?${FRESH_SIGNATURE})`
      );
    });

    test('presigns a url shared by several findMany entries once', async () => {
      const middleware = await getMiddleware();

      const richtext = `![alt](${BUCKET_URL}/photo_abc123.png)`;
      const ctx: any = { uid: modelUID, action: 'findMany', params: {} };
      const next: any = jest.fn(async () => [{ richtext }, { richtext }, { richtext }]);

      const result: any = await middleware(ctx, next);

      expect(result).toHaveLength(3);
      result.forEach((entry: any) => {
        expect(entry.richtext).toBe(`![alt](${BUCKET_URL}/photo_abc123.png?${FRESH_SIGNATURE})`);
      });
      expect(signFileUrls).toHaveBeenCalledTimes(1);
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
