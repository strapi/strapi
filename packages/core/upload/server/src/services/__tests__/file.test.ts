import os from 'os';
import path from 'path';
import fse from 'fs-extra';

import fileService from '../file';

const folderPath = '/1';

describe('file', () => {
  describe('getFolderPath', () => {
    beforeAll(() => {
      global.strapi = {
        db: {
          query() {
            return { findOne: jest.fn(() => ({ path: folderPath })) };
          },
        },
      } as any;
    });

    test.each([
      [1, folderPath],
      [undefined, '/'],
      [null, '/'],
    ])('inputs %s should give %s', async (id, expectedResult) => {
      const result = await fileService.getFolderPath(id);

      expect(result).toBe(expectedResult);
    });
  });

  describe('deleteByIds', () => {
    test('Delete 2 files', async () => {
      const remove = jest.fn();

      global.strapi = {
        plugins: {
          upload: {
            services: {
              upload: {
                remove,
              },
            },
          },
        },
        db: {
          query: () => ({
            findMany: jest.fn(() => [{ id: 1 }, { id: 2 }]),
          }),
        },
      } as any;

      const res = await fileService.deleteByIds([1, 2]);

      expect(res).toMatchObject([{ id: 1 }, { id: 2 }]);
      expect(remove).toHaveBeenCalledTimes(2);
      expect(remove).toHaveBeenNthCalledWith(1, { id: 1 });
      expect(remove).toHaveBeenCalledTimes(2);
    });
  });

  describe('signFileUrls', () => {
    let provider: any;
    const file = {
      provider: 'private-provider',
      url: 'file-url',
    } as any;

    beforeEach(() => {
      provider = {
        isPrivate: jest.fn(),
        getSignedUrl: jest.fn(),
      };

      global.strapi = {
        plugins: {
          upload: {
            provider,
          },
        },
        config: {
          get: jest.fn((key) => {
            if (key === 'plugin::upload') {
              return {
                provider: 'private-provider',
              };
            }
          }),
        },
      } as any;
    });

    test('Sign file URL when provider is private', async () => {
      provider.isPrivate.mockResolvedValue(true);
      provider.getSignedUrl.mockResolvedValue({ url: 'signed_file-url' });

      const result = await fileService.signFileUrls(file);

      expect(result).toHaveProperty('isUrlSigned', true);
      expect(result).toHaveProperty('url', 'signed_file-url');
      expect(provider.isPrivate).toHaveBeenCalledTimes(1);
      expect(provider.getSignedUrl).toHaveBeenCalledTimes(1);
    });

    test('Do not sign file URL when provider is not private', async () => {
      provider.isPrivate.mockResolvedValue(false);

      const result = await fileService.signFileUrls(file);

      expect(result).toHaveProperty('isUrlSigned', false);
      expect(result).toHaveProperty('url', 'file-url');
      expect(provider.isPrivate).toHaveBeenCalledTimes(1);
      expect(provider.getSignedUrl).not.toHaveBeenCalled();
    });
  });

  describe('fetchUrlToInputFile', () => {
    const url = 'https://example.com/files/photo.jpg';
    let tmpWorkingDirectory: string;

    /**
     * Builds a web ReadableStream from chunks, optionally erroring after all chunks are emitted.
     */
    const webStreamFrom = (chunks: Uint8Array[], errorAfterChunks?: Error) =>
      new ReadableStream<Uint8Array>({
        start(controller) {
          chunks.forEach((chunk) => controller.enqueue(chunk));
          if (errorAfterChunks) {
            controller.error(errorAfterChunks);
          } else {
            controller.close();
          }
        },
      });

    /**
     * Minimal Response-like object with a streaming body and a spied `arrayBuffer`, so tests can
     * assert the implementation never buffers the whole file.
     */
    const createStreamingResponse = ({
      chunks,
      headers = {},
      errorAfterChunks,
      body,
    }: {
      chunks?: Uint8Array[];
      headers?: Record<string, string>;
      errorAfterChunks?: Error;
      body?: null;
    }) => ({
      ok: true,
      status: 200,
      statusText: 'OK',
      url,
      headers: new Headers(headers),
      body: body === null ? null : webStreamFrom(chunks ?? [], errorAfterChunks),
      arrayBuffer: jest.fn(() => {
        throw new Error('arrayBuffer() must not be called: the body must be streamed to disk');
      }),
    });

    beforeEach(async () => {
      tmpWorkingDirectory = await fse.mkdtemp(path.join(os.tmpdir(), 'strapi-url-upload-test-'));

      global.strapi = {
        fetch: jest.fn(),
        log: { warn: jest.fn() },
      } as any;
    });

    afterEach(async () => {
      await fse.remove(tmpWorkingDirectory);
    });

    const mockFetch = (response: unknown) => {
      (global.strapi.fetch as jest.Mock).mockResolvedValue(response);
    };

    test('Streams the body to disk without ever reading it into a single buffer', async () => {
      const chunks = [Buffer.from('hello '), Buffer.from('streamed '), Buffer.from('world')].map(
        (chunk) => new Uint8Array(chunk)
      );
      const response = createStreamingResponse({ chunks });
      mockFetch(response);

      const { file } = await fileService.fetchUrlToInputFile(url, tmpWorkingDirectory);

      expect(response.arrayBuffer).not.toHaveBeenCalled();
      expect(file.filepath).toBe(path.join(tmpWorkingDirectory, 'photo.jpg'));
      expect(await fse.readFile(file.filepath, 'utf8')).toBe('hello streamed world');
    });

    test('Derives the size from the file written on disk', async () => {
      const chunks = [new Uint8Array(Buffer.alloc(500, 1)), new Uint8Array(Buffer.alloc(300, 2))];
      mockFetch(createStreamingResponse({ chunks }));

      const { file } = await fileService.fetchUrlToInputFile(url, tmpWorkingDirectory);

      const { size } = await fse.stat(file.filepath);
      expect(file.size).toBe(size);
      expect(file.size).toBe(800);
    });

    test('Rejects when the streamed bytes exceed sizeLimit and no Content-Length is sent', async () => {
      const chunks = Array.from({ length: 5 }, () => new Uint8Array(Buffer.alloc(100, 3)));
      mockFetch(createStreamingResponse({ chunks }));

      await expect(fileService.fetchUrlToInputFile(url, tmpWorkingDirectory, 250)).rejects.toThrow(
        'File too large'
      );
      await expect(fse.readdir(tmpWorkingDirectory)).resolves.toEqual([]);
    });

    test('Rejects when Content-Length understates the real body size', async () => {
      const chunks = Array.from({ length: 5 }, () => new Uint8Array(Buffer.alloc(100, 4)));
      mockFetch(createStreamingResponse({ chunks, headers: { 'content-length': '50' } }));

      await expect(fileService.fetchUrlToInputFile(url, tmpWorkingDirectory, 250)).rejects.toThrow(
        'File too large'
      );
      await expect(fse.readdir(tmpWorkingDirectory)).resolves.toEqual([]);
    });

    test('Rejects early when Content-Length exceeds sizeLimit', async () => {
      const response = createStreamingResponse({
        chunks: [new Uint8Array(Buffer.alloc(10))],
        headers: { 'content-length': String(5 * 1024 * 1024) },
      });
      mockFetch(response);

      const onProgress = jest.fn();
      await expect(
        fileService.fetchUrlToInputFile(url, tmpWorkingDirectory, 1024 * 1024, onProgress)
      ).rejects.toThrow('File too large: maximum allowed size is 1 MB');
      expect(response.arrayBuffer).not.toHaveBeenCalled();
      // Rejected on the header fast-path, so no progress is ever announced
      expect(onProgress).not.toHaveBeenCalled();
      await expect(fse.readdir(tmpWorkingDirectory)).resolves.toEqual([]);
    });

    test('Reports small size limits in a readable unit rather than rounding them to 0MB', async () => {
      const sizeLimit = 200 * 1000;
      mockFetch(
        createStreamingResponse({
          chunks: [new Uint8Array(Buffer.alloc(sizeLimit + 1, 1))],
        })
      );

      // A 200KB limit is well under 1MB: formatting it in whole megabytes would tell the user the
      // maximum allowed size is "0MB".
      await expect(
        fileService.fetchUrlToInputFile(url, tmpWorkingDirectory, sizeLimit)
      ).rejects.toThrow('File too large: maximum allowed size is 200 KB');
    });

    test('Removes the partial temp file when the stream errors mid-transfer', async () => {
      const chunks = [new Uint8Array(Buffer.alloc(100, 5))];
      mockFetch(createStreamingResponse({ chunks, errorAfterChunks: new Error('socket hang up') }));

      await expect(fileService.fetchUrlToInputFile(url, tmpWorkingDirectory)).rejects.toThrow(
        'socket hang up'
      );
      await expect(fse.readdir(tmpWorkingDirectory)).resolves.toEqual([]);
    });

    test('Reports cumulative progress with the parsed Content-Length as totalBytes', async () => {
      const chunks = [
        new Uint8Array(Buffer.alloc(100, 6)),
        new Uint8Array(Buffer.alloc(150, 7)),
        new Uint8Array(Buffer.alloc(50, 8)),
      ];
      mockFetch(createStreamingResponse({ chunks, headers: { 'content-length': '300' } }));

      const onProgress = jest.fn();
      await fileService.fetchUrlToInputFile(url, tmpWorkingDirectory, undefined, onProgress);

      expect(onProgress.mock.calls.map(([progress]) => progress)).toEqual([
        // Initial announcement, before any bytes are read
        { bytesWritten: 0, totalBytes: 300 },
        { bytesWritten: 100, totalBytes: 300 },
        { bytesWritten: 250, totalBytes: 300 },
        { bytesWritten: 300, totalBytes: 300 },
      ]);
    });

    test('Announces totalBytes with a zero-byte report before the first chunk', async () => {
      const chunks = [new Uint8Array(Buffer.alloc(400, 1)), new Uint8Array(Buffer.alloc(600, 2))];
      mockFetch(createStreamingResponse({ chunks, headers: { 'content-length': '1000' } }));

      const onProgress = jest.fn();
      await fileService.fetchUrlToInputFile(url, tmpWorkingDirectory, undefined, onProgress);

      // Ordering matters: consumers size their progress bar from this first report, so it must
      // land before any chunk-driven call rather than merely happen at some point.
      expect(onProgress.mock.calls[0][0]).toEqual({ bytesWritten: 0, totalBytes: 1000 });
      expect(onProgress.mock.calls[1][0]).toEqual({ bytesWritten: 400, totalBytes: 1000 });
    });

    test('Reports totalBytes as null throughout when Content-Length is absent', async () => {
      mockFetch(createStreamingResponse({ chunks: [new Uint8Array(Buffer.alloc(25, 3))] }));

      const onProgress = jest.fn();
      await fileService.fetchUrlToInputFile(url, tmpWorkingDirectory, undefined, onProgress);

      // Null in the initial announcement, and still null once bytes flow — a consumer must not see
      // a total materialise mid-stream
      expect(onProgress.mock.calls.map(([progress]) => progress)).toEqual([
        { bytesWritten: 0, totalBytes: null },
        { bytesWritten: 25, totalBytes: null },
      ]);
    });

    test('Reports every chunk without internal throttling', async () => {
      // 10 chunks emitted back-to-back: a naive time-based throttle inside the service would
      // collapse these into one or two reports. Throttling is the caller's responsibility.
      const chunkCount = 10;
      const chunks = Array.from({ length: chunkCount }, () => new Uint8Array(Buffer.alloc(64, 4)));
      mockFetch(createStreamingResponse({ chunks }));

      const onProgress = jest.fn();
      await fileService.fetchUrlToInputFile(url, tmpWorkingDirectory, undefined, onProgress);

      // One report per chunk, plus the initial zero-byte announcement
      expect(onProgress).toHaveBeenCalledTimes(chunkCount + 1);
      expect(onProgress.mock.calls.map(([progress]) => progress.bytesWritten)).toEqual([
        0, 64, 128, 192, 256, 320, 384, 448, 512, 576, 640,
      ]);
    });

    test('Ignores a throwing progress callback instead of failing the import', async () => {
      const chunks = [
        new Uint8Array(Buffer.from('still ')),
        new Uint8Array(Buffer.from('written')),
      ];
      mockFetch(createStreamingResponse({ chunks }));

      const onProgress = jest.fn(() => {
        throw new Error('consumer bug');
      });

      // Node surfaces a synchronous throw from `_transform` as a stream error, so an unguarded
      // callback would reject the pipeline and abort a download that was otherwise fine
      const { file } = await fileService.fetchUrlToInputFile(
        url,
        tmpWorkingDirectory,
        undefined,
        onProgress
      );

      expect(await fse.readFile(file.filepath, 'utf8')).toBe('still written');
      expect(file.size).toBe(13);
      // Every report still attempted — one failing call does not disable subsequent reporting
      expect(onProgress).toHaveBeenCalledTimes(chunks.length + 1);
      expect(global.strapi.log.warn).toHaveBeenCalledWith(
        expect.stringContaining('progress callback threw')
      );
    });

    test('Keeps the original error when removing the partial temp file fails', async () => {
      const chunks = [new Uint8Array(Buffer.alloc(100, 5))];
      mockFetch(createStreamingResponse({ chunks, errorAfterChunks: new Error('socket hang up') }));

      // `fse.remove` is overloaded (promise + callback), so mock the implementation rather than
      // using mockRejectedValue, which resolves against the callback signature
      const removeSpy = jest.spyOn(fse, 'remove').mockImplementation(async () => {
        throw new Error('EPERM: operation not permitted');
      });

      try {
        // The cleanup failure must not mask the error the caller acts on
        await expect(fileService.fetchUrlToInputFile(url, tmpWorkingDirectory)).rejects.toThrow(
          'socket hang up'
        );
        expect(global.strapi.log.warn).toHaveBeenCalledWith(
          expect.stringContaining('Could not remove partial temp file')
        );
      } finally {
        removeSpy.mockRestore();
      }
    });

    test('Works without a progress callback', async () => {
      mockFetch(createStreamingResponse({ chunks: [new Uint8Array(Buffer.from('no callback'))] }));

      const { file } = await fileService.fetchUrlToInputFile(url, tmpWorkingDirectory);

      expect(file.size).toBe(11);
    });

    test('Writes an empty file when the response has no body', async () => {
      mockFetch(createStreamingResponse({ body: null }));

      const onProgress = jest.fn();
      const { file } = await fileService.fetchUrlToInputFile(
        url,
        tmpWorkingDirectory,
        undefined,
        onProgress
      );

      expect(file.size).toBe(0);
      await expect(fse.readFile(file.filepath, 'utf8')).resolves.toBe('');
      // The initial announcement still fires, so the first report is always a size announcement
      expect(onProgress.mock.calls).toEqual([[{ bytesWritten: 0, totalBytes: null }]]);
    });
  });
});
