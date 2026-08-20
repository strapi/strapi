import { Readable } from 'stream';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';
import type { Core } from '@strapi/types';

import { createAssetsStream, getFileStatsForTransfer } from '../assets';
import type { IAsset } from '../../../../types';

const REMOTE_FILE_URL = 'https://cdn.example.com/file.pdf';
const REMOTE_FILE_CHUNKS = ['compressed response ', 'contents'];
const COMPRESSED_CONTENT_LENGTH = '12';
const PLAIN_CONTENT_LENGTH = '2048';
const NOT_FOUND_STATUS = 404;
const REMOTE_PROVIDER_NAME = 'aws-s3';
const LOCAL_PROVIDER_NAME = 'local';

describe('getFileStatsForTransfer', () => {
  test('uses the response body size when a remote response has no content-length header', async () => {
    const encoder = new TextEncoder();
    const response = new Response(
      new ReadableStream({
        start(controller) {
          for (const chunk of REMOTE_FILE_CHUNKS) {
            controller.enqueue(encoder.encode(chunk));
          }
          controller.close();
        },
      })
    );
    const arrayBufferSpy = jest.spyOn(response, 'arrayBuffer');
    const strapi = {
      fetch: jest.fn().mockResolvedValue(response),
    } as unknown as Core.Strapi;

    await expect(getFileStatsForTransfer(REMOTE_FILE_URL, strapi)).resolves.toEqual({
      size: Buffer.byteLength(REMOTE_FILE_CHUNKS.join('')),
    });
    expect(arrayBufferSpy).not.toHaveBeenCalled();
  });

  test('uses the decoded body size when content-length describes compressed bytes', async () => {
    const body = REMOTE_FILE_CHUNKS.join('');
    const response = new Response(body, {
      headers: {
        'content-encoding': 'gzip',
        'content-length': COMPRESSED_CONTENT_LENGTH,
      },
    });
    const strapi = {
      fetch: jest.fn().mockResolvedValue(response),
    } as unknown as Core.Strapi;

    await expect(getFileStatsForTransfer(REMOTE_FILE_URL, strapi)).resolves.toEqual({
      size: Buffer.byteLength(body),
    });
  });

  test('keeps the content-length fast path when the response is not encoded', async () => {
    const response = new Response(REMOTE_FILE_CHUNKS.join(''), {
      headers: { 'content-length': PLAIN_CONTENT_LENGTH },
    });
    const bodySpy = jest.spyOn(response, 'body', 'get');
    const strapi = {
      fetch: jest.fn().mockResolvedValue(response),
    } as unknown as Core.Strapi;

    await expect(getFileStatsForTransfer(REMOTE_FILE_URL, strapi)).resolves.toEqual({
      size: Number(PLAIN_CONTENT_LENGTH),
    });
    expect(bodySpy).not.toHaveBeenCalled();
  });

  test('reports a zero size when the response has no body', async () => {
    const strapi = {
      fetch: jest.fn().mockResolvedValue(new Response(null)),
    } as unknown as Core.Strapi;

    await expect(getFileStatsForTransfer(REMOTE_FILE_URL, strapi)).resolves.toEqual({ size: 0 });
  });

  test('rejects when the remote response is not a success', async () => {
    const strapi = {
      fetch: jest.fn().mockResolvedValue(new Response(null, { status: NOT_FOUND_STATUS })),
    } as unknown as Core.Strapi;

    await expect(getFileStatsForTransfer(REMOTE_FILE_URL, strapi)).rejects.toThrow(
      `Request failed with status code ${NOT_FOUND_STATUS}`
    );
  });
});

describe('Local source assets stream warnings', () => {
  let publicDir: string;

  beforeEach(async () => {
    publicDir = await mkdtemp(join(tmpdir(), 'strapi-transfer-assets-'));
    await mkdir(join(publicDir, 'uploads'), { recursive: true });
  });

  afterEach(async () => {
    await rm(publicDir, { recursive: true, force: true });
  });

  test('reports warning callback when media DB row points to missing file', async () => {
    const missingFile = {
      id: 42,
      hash: 'missing-hash',
      ext: '.jpg',
      url: '/uploads/does-not-exist.jpg',
      provider: 'local',
      formats: undefined,
    };

    const warn = jest.fn();
    const strapi = {
      db: {
        queryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          stream: jest.fn(() => Readable.from([missingFile])),
        })),
      },
      dirs: {
        static: { public: publicDir },
      },
      log: {
        warn,
      },
      plugins: {
        upload: {
          provider: {
            isPrivate: jest.fn().mockResolvedValue(false),
          },
        },
      },
      config: {
        get: jest.fn(() => ({ provider: 'local' })),
      },
    } as any;

    const onWarning = jest.fn();
    const stream = createAssetsStream(strapi, { onWarning });

    const items: unknown[] = [];
    for await (const item of stream) {
      items.push(item);
    }

    expect(items).toHaveLength(0);
    expect(onWarning).toHaveBeenCalledWith(
      expect.stringContaining(
        'Media item 42 (hash: missing-hash) exists in database but no corresponding file was found to transfer'
      )
    );
    expect(warn).toHaveBeenCalledWith(expect.stringContaining('Media item 42'));
  });

  test('streams a remote asset with the size measured from the response body', async () => {
    const body = REMOTE_FILE_CHUNKS.join('');
    const remoteFile = {
      id: 7,
      hash: 'remote-hash',
      ext: '.pdf',
      url: REMOTE_FILE_URL,
      provider: REMOTE_PROVIDER_NAME,
      formats: undefined,
    };

    const strapi = {
      db: {
        queryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          stream: jest.fn(() => Readable.from([remoteFile])),
        })),
      },
      dirs: { static: { public: publicDir } },
      log: { warn: jest.fn() },
      // A fresh Response per call: the body is consumed once for the size and once for the stream.
      fetch: jest.fn(() => Promise.resolve(new Response(body))),
      plugins: {
        upload: {
          provider: { isPrivate: jest.fn().mockResolvedValue(false) },
        },
      },
      config: {
        get: jest.fn(() => ({ provider: LOCAL_PROVIDER_NAME })),
      },
    } as any;

    const items: IAsset[] = [];
    for await (const item of createAssetsStream(strapi)) {
      items.push(item);
    }

    expect(items).toHaveLength(1);
    expect(items[0].stats).toEqual({ size: Buffer.byteLength(body) });

    const chunks: Buffer[] = [];
    for await (const chunk of items[0].stream) {
      chunks.push(chunk);
    }
    expect(Buffer.concat(chunks).toString()).toBe(body);
  });

  test('does not include admin project-settings logos (only media-library files)', async () => {
    await writeFile(join(publicDir, 'uploads', 'media-hash.jpg'), Buffer.from('media'));

    const uploadFile = {
      id: 1,
      hash: 'media-hash',
      ext: '.jpg',
      url: '/uploads/media-hash.jpg',
      provider: 'local',
      formats: undefined,
    };

    const strapi = {
      db: {
        queryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          stream: jest.fn(() => Readable.from([uploadFile])),
        })),
      },
      dirs: {
        static: { public: publicDir },
      },
      log: { warn: jest.fn() },
      plugins: {
        upload: {
          provider: {
            isPrivate: jest.fn().mockResolvedValue(false),
          },
        },
      },
      config: {
        get: jest.fn(() => ({ provider: 'local' })),
      },
      store: () => ({
        get: jest.fn().mockResolvedValue({
          menuLogo: {
            hash: 'menu_logo',
            ext: '.png',
            url: '/uploads/menu_logo.png',
            provider: 'local',
          },
        }),
      }),
    } as any;

    const stream = createAssetsStream(strapi);
    const items: unknown[] = [];

    for await (const item of stream) {
      items.push(item);
    }

    expect(items).toHaveLength(1);
    expect(items[0]).toMatchObject({
      filename: 'media-hash.jpg',
      metadata: expect.objectContaining({ id: 1 }),
    });
  });
});
