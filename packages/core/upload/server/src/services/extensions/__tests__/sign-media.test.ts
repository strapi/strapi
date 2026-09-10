import type { UID } from '@strapi/types';
import { signEntityMedia } from '../utils';
import { getService } from '../../../utils';

jest.mock('../../../utils');

describe('Upload | extensions | entity-manager', () => {
  const modelUID = 'model' as UID.Schema;
  const componentUID = 'component';

  const models = {
    [modelUID]: {
      attributes: {
        media: {
          type: 'media',
          multiple: false,
        },
        media_repeatable: {
          type: 'media',
          multiple: true,
        },
        compo_media_repeatable: {
          type: 'component',
          repeatable: true,
          component: componentUID,
        },
        compo_media: {
          type: 'component',
          component: componentUID,
        },
        dynamicZone: {
          type: 'dynamiczone',
          components: [componentUID],
        },
        richtext: {
          type: 'richtext',
        },
        blocks: {
          type: 'blocks',
        },
      },
    },
    [componentUID]: {
      attributes: {
        media_repeatable: {
          type: 'media',
          multiple: true,
        },
        media: {
          type: 'media',
          multiple: false,
        },
        richtext: {
          type: 'richtext',
        },
        blocks: {
          type: 'blocks',
        },
      },
    },
  } as const;

  const media = ['media', 'media_1'].map((entry) => ({
    formats: {
      thumbnail: {
        url: `${entry}_thumb`,
      },
      large: {
        url: `${entry}_large`,
      },
      small: {
        url: `${entry}_small`,
      },
      medium: {
        url: `${entry}_medium`,
      },
    },
    url: `${entry}_url`,
  }));

  describe('signEntityMedia', () => {
    let spySignFileUrls: any;
    beforeEach(() => {
      spySignFileUrls = jest.fn();
      jest.mocked(getService).mockImplementation(() => ({
        signFileUrls: spySignFileUrls,
        getFolderPath: jest.fn(),
        deleteByIds: jest.fn(),
        computeMetrics: jest.fn().mockResolvedValue({
          assetNumber: 0,
          folderNumber: 0,
          averageDepth: 0,
          maxDepth: 0,
          averageDeviationDepth: 0,
        }),
        sendMetrics: jest.fn().mockResolvedValue(undefined),
        ensureWeeklyStoredCronSchedule: jest.fn().mockResolvedValue(undefined),
        registerCron: jest.fn().mockResolvedValue(undefined),
      }));

      global.strapi = {
        plugins: {
          upload: {},
        },
        config: {
          get: jest.fn(() => ({ provider: 'aws-s3' })),
        },
        getModel: jest.fn((uid: keyof typeof models) => models[uid]),
      } as any;
    });

    test('makes correct calls for media attribute', async () => {
      const entity = {
        media: media[0],
      };

      await signEntityMedia(entity, modelUID);
      expect(getService).toBeCalledWith('file');
      expect(spySignFileUrls).toBeCalledWith(entity.media);
    });

    test('makes correct calls for repeatable media', async () => {
      const entity = {
        media_repeatable: media,
      };

      await signEntityMedia(entity, modelUID);
      expect(getService).toBeCalledWith('file');
      expect(spySignFileUrls).toBeCalledTimes(2);
      expect(spySignFileUrls).toBeCalledWith(media[0], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[1], expect.anything());
    });

    test('makes correct calls for components', async () => {
      const entity = {
        compo_media: {
          media: media[0],
          media_repeatable: media,
        },
      };

      await signEntityMedia(entity, modelUID);
      expect(getService).toBeCalledWith('file');
      expect(spySignFileUrls).toBeCalledTimes(3);
      expect(spySignFileUrls).toBeCalledWith(media[0], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[0], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[1], expect.anything());
    });

    test('makes correct calls for repeatable components', async () => {
      const entity = {
        compo_media_repeatable: [
          {
            media: media[0],
            media_repeatable: media,
          },
          {
            media: media[1],
            media_repeatable: media,
          },
        ],
      };

      await signEntityMedia(entity, modelUID);
      expect(getService).toBeCalledWith('file');
      expect(spySignFileUrls).toBeCalledTimes(6);
      expect(spySignFileUrls).toBeCalledWith(media[0], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[1], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[0], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[1], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[0], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[1], expect.anything());
    });

    test('makes correct calls for dynamic zones', async () => {
      const entity = {
        dynamicZone: [
          {
            __component: componentUID,
            media_repeatable: media,
            media: media[1],
          },
        ],
      };

      await signEntityMedia(entity, modelUID);
      expect(getService).toBeCalledWith('file');
      expect(spySignFileUrls).toBeCalledTimes(3);
      expect(spySignFileUrls).toBeCalledWith(media[0], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[1], expect.anything());
      expect(spySignFileUrls).toBeCalledWith(media[1], expect.anything());
    });
  });

  describe('signEntityMedia | richtext and blocks', () => {
    const BUCKET_URL = 'https://my-bucket.s3.eu-west-1.amazonaws.com';

    let signFileUrls: any;

    /**
     * Mimics the real `signFileUrls`: `isUrlSigned` is set for every file of
     * the configured private provider, but the provider itself only rewrites
     * URLs from its own bucket and hands every other URL back untouched. The
     * signature always replaces whatever query string the stored URL had.
     */
    const fakeSignFileUrls = jest.fn(async (file: any) => {
      const isOwned = (url: string) => url.startsWith(`${BUCKET_URL}/`);
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
        formats: { thumbnail: { url: `${BUCKET_URL}/thumbnail_photo_abc123.png` } },
        ...overrides,
      },
      children: [{ type: 'text', text: '' }],
    });

    beforeEach(() => {
      fakeSignFileUrls.mockClear();
      signFileUrls = fakeSignFileUrls;
      jest.mocked(getService).mockImplementation(() => ({ signFileUrls }) as any);
    });

    describe('blocks', () => {
      test('signs the url and every format of an image node', async () => {
        const entity = { blocks: [imageNode(`${BUCKET_URL}/photo_abc123.png`)] };

        const result: any = await signEntityMedia(entity, modelUID);

        expect(result.blocks[0].image.url).toBe(`${BUCKET_URL}/photo_abc123.png?signature=fresh`);
        expect(result.blocks[0].image.formats.thumbnail.url).toBe(
          `${BUCKET_URL}/thumbnail_photo_abc123.png?signature=fresh`
        );
        // the stored value is never mutated
        expect(entity.blocks[0].image.url).toBe(`${BUCKET_URL}/photo_abc123.png`);
      });

      test('re-signs an image whose stored url still carries an expired signature', async () => {
        const entity = {
          blocks: [imageNode(`${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired`)],
        };

        const result: any = await signEntityMedia(entity, modelUID);

        expect(result.blocks[0].image.url).toBe(`${BUCKET_URL}/photo_abc123.png?signature=fresh`);
      });

      test('signs image nodes nested in children', async () => {
        const entity = {
          blocks: [
            {
              type: 'list',
              children: [
                { type: 'list-item', children: [imageNode(`${BUCKET_URL}/photo_abc123.png`)] },
              ],
            },
          ],
        };

        const result: any = await signEntityMedia(entity, modelUID);

        expect(result.blocks[0].children[0].children[0].image.url).toBe(
          `${BUCKET_URL}/photo_abc123.png?signature=fresh`
        );
      });

      test('leaves images from another provider and non array values untouched', async () => {
        const external = imageNode('https://example.com/photo_abc123.png', {
          provider: 'local',
          formats: undefined,
        });
        const entity = { blocks: [external] };

        const result: any = await signEntityMedia(entity, modelUID);
        expect(result.blocks[0].image.url).toBe('https://example.com/photo_abc123.png');

        await expect(signEntityMedia({ blocks: null }, modelUID)).resolves.toEqual({
          blocks: null,
        });
      });
    });

    describe('richtext', () => {
      test('signs markdown image and link urls owned by the provider', async () => {
        const entity = {
          richtext: `![alt](${BUCKET_URL}/photo_abc123.png)\n\n[doc](${BUCKET_URL}/doc_abc123.pdf)`,
        };

        const result: any = await signEntityMedia(entity, modelUID);

        expect(result.richtext).toBe(
          `![alt](${BUCKET_URL}/photo_abc123.png?signature=fresh)\n\n` +
            `[doc](${BUCKET_URL}/doc_abc123.pdf?signature=fresh)`
        );
      });

      test('re-signs a url that still carries an expired signature', async () => {
        const entity = {
          richtext: `![alt](${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired)`,
        };

        const result: any = await signEntityMedia(entity, modelUID);

        expect(result.richtext).toBe(`![alt](${BUCKET_URL}/photo_abc123.png?signature=fresh)`);
      });

      test('leaves external urls, and their query string, untouched', async () => {
        const entity = { richtext: '![alt](https://example.com/photo.png?width=200)' };

        const result: any = await signEntityMedia(entity, modelUID);

        expect(result.richtext).toBe('![alt](https://example.com/photo.png?width=200)');
      });

      test('leaves local urls, and their query string, untouched', async () => {
        const entity = { richtext: '![alt](/uploads/photo.png?v=1)' };

        const result: any = await signEntityMedia(entity, modelUID);

        expect(result.richtext).toBe('![alt](/uploads/photo.png?v=1)');
      });

      test('signs raw html src and href urls owned by the provider', async () => {
        const entity = {
          richtext:
            `<img src="${BUCKET_URL}/photo_abc123.png?X-Amz-Signature=expired" width="200">\n` +
            `<a href='${BUCKET_URL}/doc_abc123.pdf'>doc</a>\n` +
            '<img src="https://example.com/x.png?w=1">',
        };

        const result: any = await signEntityMedia(entity, modelUID);

        expect(result.richtext).toBe(
          `<img src="${BUCKET_URL}/photo_abc123.png?signature=fresh" width="200">\n` +
            `<a href='${BUCKET_URL}/doc_abc123.pdf?signature=fresh'>doc</a>\n` +
            '<img src="https://example.com/x.png?w=1">'
        );
      });

      test('rewrites markdown and html urls of the same value in document order', async () => {
        const entity = {
          richtext: `<img src="${BUCKET_URL}/a.png"> then ![b](${BUCKET_URL}/b.png) then <a href="${BUCKET_URL}/c.pdf">c</a>`,
        };

        const result: any = await signEntityMedia(entity, modelUID);

        expect(result.richtext).toBe(
          `<img src="${BUCKET_URL}/a.png?signature=fresh"> then ![b](${BUCKET_URL}/b.png?signature=fresh) then <a href="${BUCKET_URL}/c.pdf?signature=fresh">c</a>`
        );
      });

      test('short circuits when the value has no markdown link nor html url', async () => {
        const entity = { richtext: 'Just a paragraph of text with <b>bold</b>.' };

        const result: any = await signEntityMedia(entity, modelUID);

        expect(result.richtext).toBe('Just a paragraph of text with <b>bold</b>.');
        expect(signFileUrls).not.toHaveBeenCalled();
      });
    });

    test('signs richtext and blocks nested in components and dynamic zones', async () => {
      const entity = {
        compo_media: {
          richtext: `![alt](${BUCKET_URL}/photo_abc123.png)`,
        },
        dynamicZone: [
          {
            __component: componentUID,
            blocks: [imageNode(`${BUCKET_URL}/photo_abc123.png`)],
          },
        ],
      };

      const result: any = await signEntityMedia(entity, modelUID);

      expect(result.compo_media.richtext).toBe(
        `![alt](${BUCKET_URL}/photo_abc123.png?signature=fresh)`
      );
      expect(result.dynamicZone[0].blocks[0].image.url).toBe(
        `${BUCKET_URL}/photo_abc123.png?signature=fresh`
      );
    });
  });
});
