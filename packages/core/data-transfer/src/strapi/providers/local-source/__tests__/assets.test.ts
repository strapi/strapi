import { Readable } from 'stream';
import { mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { join } from 'path';
import { tmpdir } from 'os';

import { createAssetsStream } from '../assets';

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

describe('Local source assets stream — remote asset size', () => {
  test('reports a size that matches the streamed bytes for a remote (cloud) file', async () => {
    // A Cloudinary-hosted SVG in a subfolder. Its response has NO content-length
    // header (chunked transfer) — common for cloud/CDN providers. The tar entry
    // is built from stats.size, so if that doesn't match the streamed bytes the
    // export crashes with "Failed to create an asset tar entry".
    const body = Buffer.from('<svg data-note="chunked, no content-length" />');

    const remoteFile = {
      id: 7,
      hash: 'New_Balance2_13004e51a8',
      ext: '.svg',
      url: 'https://res.cloudinary.com/demo/image/upload/cms/New_Balance2_13004e51a8.svg',
      provider: 'cloudinary',
      formats: undefined,
    };

    // Each fetch() must return a fresh response (a body stream is consumed once):
    // once for getFileStatsForTransfer, once for getFileStream.
    const fetch = jest.fn(() =>
      Promise.resolve({
        status: 200,
        headers: { get: () => null }, // no content-length (chunked)
        body: Readable.toWeb(Readable.from([body])),
      })
    );

    const strapi = {
      db: {
        queryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          stream: jest.fn(() => Readable.from([remoteFile])),
        })),
      },
      dirs: { static: { public: '/tmp/unused' } },
      log: { warn: jest.fn() },
      fetch,
      plugins: {
        upload: { provider: { isPrivate: jest.fn().mockResolvedValue(false) } },
      },
      config: { get: jest.fn(() => ({ provider: 'cloudinary' })) },
    } as any;

    // Consume each asset's stream DURING iteration, exactly like the file
    // destination does (it pipes the stream into the tar before pulling the next
    // asset). This also matches how temp files are cleaned up as we advance.
    const stream = createAssetsStream(strapi);
    let assetCount = 0;
    let declaredSize = -1;
    let streamedBytes = -1;

    for await (const asset of stream) {
      assetCount += 1;
      declaredSize = (asset as any).stats.size;

      const chunks: Buffer[] = [];
      for await (const chunk of (asset as any).stream) {
        chunks.push(chunk as Buffer);
      }
      streamedBytes = Buffer.concat(chunks).length;
    }

    expect(assetCount).toBe(1);

    // The declared size (used for the tar entry header) MUST equal the streamed
    // bytes. Before the fix it does not: content-length is missing, so stats.size
    // is 0 while the stream carries the real bytes → the tar entry write fails.
    expect(declaredSize).toBe(streamedBytes);
  });
});
