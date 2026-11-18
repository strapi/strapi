import { Readable } from 'stream';
import { access, mkdtemp, mkdir, writeFile, rm } from 'fs/promises';
import { createServer, IncomingMessage, Server, ServerResponse } from 'http';
import { AddressInfo } from 'net';
import { join } from 'path';
import { tmpdir } from 'os';

import type { IAsset } from '../../../../types';
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

  test.each([null, undefined])(
    'uses a canonical filename when the extension is %s',
    async (ext) => {
      await writeFile(join(publicDir, 'uploads', 'media-hash'), Buffer.from('media'));

      const uploadFile = {
        id: 1,
        hash: 'media-hash',
        ext,
        url: '/uploads/media-hash',
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
      } as any;

      const items = [];
      for await (const item of createAssetsStream(strapi)) {
        items.push(item);
      }

      expect(items).toHaveLength(1);
      expect(items[0]).toMatchObject({ filename: 'media-hash' });
    }
  );
});

describe('Local source assets stream with a remote provider', () => {
  const FILE_SIZE = 256 * 1024;
  const CHUNK_SIZE = 16 * 1024;

  let server: Server;
  let baseUrl: string;
  let requests: string[];
  let openRequests: number;
  let maxOpenRequests: number;
  let respond: (req: IncomingMessage, res: ServerResponse) => void;

  const contentOf = (path: string) => Buffer.alloc(FILE_SIZE, path);

  const serveFile = (req: IncomingMessage, res: ServerResponse) => {
    const content = contentOf(req.url!);
    res.writeHead(200, { 'content-length': content.length });
    let offset = 0;
    const write = () => {
      while (offset < content.length) {
        const chunk = content.subarray(offset, offset + CHUNK_SIZE);
        offset += chunk.length;
        if (!res.write(chunk)) {
          res.once('drain', write);
          return;
        }
      }
      res.end();
    };
    write();
  };

  const createStrapi = (files: object[]) =>
    ({
      db: {
        queryBuilder: jest.fn(() => ({
          select: jest.fn().mockReturnThis(),
          stream: jest.fn(() => Readable.from(files)),
        })),
      },
      dirs: { static: { public: tmpdir() } },
      fetch: (url: string) => fetch(url),
      log: { warn: jest.fn() },
      plugins: { upload: { provider: { isPrivate: jest.fn().mockResolvedValue(false) } } },
      config: { get: jest.fn(() => ({ provider: 'aws-s3' })) },
    }) as any;

  const remoteFile = (id: number, formats?: Record<string, object>) => ({
    id,
    hash: `hash-${id}`,
    ext: '.bin',
    url: `${baseUrl}/file-${id}`,
    provider: 'aws-s3',
    formats,
  });

  const readAll = async (stream: Readable) => {
    const chunks: Buffer[] = [];
    for await (const chunk of stream) {
      chunks.push(chunk);
    }
    return Buffer.concat(chunks);
  };

  beforeEach(async () => {
    requests = [];
    openRequests = 0;
    maxOpenRequests = 0;
    respond = serveFile;
    server = createServer((req, res) => {
      requests.push(req.url!);
      openRequests += 1;
      maxOpenRequests = Math.max(maxOpenRequests, openRequests);
      res.on('close', () => {
        openRequests -= 1;
      });
      respond(req, res);
    });
    await new Promise<void>((resolve) => {
      server.listen(0, '127.0.0.1', resolve);
    });
    baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  });

  afterEach(async () => {
    server.closeAllConnections();
    await new Promise((resolve) => {
      server.close(resolve);
    });
  });

  test('downloads each file and format once, without keeping connections open while buffered', async () => {
    const files = [
      remoteFile(1, {
        thumbnail: { hash: 'thumb-1', ext: '.bin', url: `${baseUrl}/thumb-1` },
      }),
      remoteFile(2),
      remoteFile(3),
    ];

    // Collect every item before reading any of the file streams, like the engine's read-ahead
    const items: IAsset[] = [];
    for await (const item of createAssetsStream(createStrapi(files))) {
      items.push(item);
    }

    expect(requests).toEqual(['/file-1', '/thumb-1', '/file-2', '/file-3']);
    expect(maxOpenRequests).toBe(1);
    expect(openRequests).toBe(0);

    for (const item of items) {
      const content = await readAll(item.stream);
      expect(item.stats.size).toBe(FILE_SIZE);
      expect(content.equals(contentOf(new URL(item.filepath).pathname))).toBe(true);
    }
  });

  test('removes the temporary file once the stream is closed', async () => {
    const items: IAsset[] = [];
    for await (const item of createAssetsStream(createStrapi([remoteFile(1)]))) {
      items.push(item);
    }

    const tempFile = (items[0].stream as unknown as { path: string }).path;
    await expect(access(tempFile)).resolves.toBeUndefined();

    await readAll(items[0].stream);

    // The file is removed asynchronously after the stream emits 'close'
    const isRemoved = () =>
      access(tempFile).then(
        () => false,
        () => true
      );
    for (let attempt = 0; attempt < 50 && !(await isRemoved()); attempt += 1) {
      await new Promise((resolve) => {
        setTimeout(resolve, 10);
      });
    }

    await expect(access(tempFile)).rejects.toMatchObject({ code: 'ENOENT' });
  });

  test('retries a download when the connection is dropped', async () => {
    let attempts = 0;
    respond = (req, res) => {
      attempts += 1;
      if (attempts === 1) {
        res.writeHead(200, { 'content-length': FILE_SIZE });
        res.write(Buffer.alloc(CHUNK_SIZE), () => res.socket?.destroy());
        return;
      }
      serveFile(req, res);
    };
    const strapi = createStrapi([remoteFile(1)]);

    const items: IAsset[] = [];
    for await (const item of createAssetsStream(strapi)) {
      items.push(item);
    }

    expect(attempts).toBe(2);
    expect(strapi.log.warn).toHaveBeenCalledWith(expect.stringContaining('(attempt 1/3)'));
    expect((await readAll(items[0].stream)).equals(contentOf('/file-1'))).toBe(true);
  });

  test('fails without retrying when the storage responds with an error status', async () => {
    respond = (_req, res) => {
      res.writeHead(403);
      res.end();
    };

    const consume = async () => {
      for await (const item of createAssetsStream(createStrapi([remoteFile(1)]))) {
        expect(item).toBeUndefined();
      }
    };

    await expect(consume()).rejects.toThrow('Request failed with status code 403');
    expect(requests).toHaveLength(1);
  });
});
