import {
  isChunkLoadError,
  retryDynamicImport,
  wrapRouteObjectLazyWithRetry,
} from '../retryDynamicImport';

import type { RouteObject } from 'react-router-dom';

describe('retryDynamicImport', () => {
  describe('isChunkLoadError', () => {
    it('detects Chrome dynamic import fetch failure', () => {
      expect(
        isChunkLoadError(
          new TypeError('Failed to fetch dynamically imported module: https://example.com/a.js')
        )
      ).toBe(true);
    });

    it('detects Firefox message', () => {
      expect(isChunkLoadError(new TypeError('Importing a module script failed'))).toBe(true);
    });

    it('detects ChunkLoadError name', () => {
      const err = new Error('x');
      err.name = 'ChunkLoadError';
      expect(isChunkLoadError(err)).toBe(true);
    });

    it('returns false for unrelated errors', () => {
      expect(isChunkLoadError(new Error('compile failed'))).toBe(false);
    });
  });

  describe('retryDynamicImport', () => {
    it('does not retry on non-chunk errors', async () => {
      let calls = 0;
      await expect(
        retryDynamicImport(() => {
          calls++;
          return Promise.reject(new Error('nope'));
        })
      ).rejects.toThrow('nope');
      expect(calls).toBe(1);
    });

    describe('chunk load retries', () => {
      const chromeChunkMessage =
        'Failed to fetch dynamically imported module: https://cdn.example/chunk.js';

      beforeEach(() => {
        jest.useFakeTimers();
        jest.spyOn(Math, 'random').mockReturnValue(0);
      });

      afterEach(() => {
        jest.useRealTimers();
        jest.restoreAllMocks();
      });

      it('succeeds after prior chunk errors once the importer resolves', async () => {
        let calls = 0;
        const chunkError = new TypeError(chromeChunkMessage);

        const resultPromise = retryDynamicImport(
          () => {
            calls += 1;
            if (calls < 3) {
              return Promise.reject(chunkError);
            }
            return Promise.resolve('module');
          },
          { initialDelayMs: 10, maxDelayMs: 80 }
        );

        await jest.runOnlyPendingTimersAsync();
        await jest.runOnlyPendingTimersAsync();

        await expect(resultPromise).resolves.toBe('module');
        expect(calls).toBe(3);
      });

      it('rejects with the last chunk error after maxAttempts importer failures', async () => {
        let calls = 0;
        const chunkError = new TypeError(chromeChunkMessage);

        const resultPromise = retryDynamicImport(
          () => {
            calls += 1;
            return Promise.reject(chunkError);
          },
          { maxAttempts: 3, initialDelayMs: 10, maxDelayMs: 80 }
        );

        await jest.runOnlyPendingTimersAsync();
        await jest.runOnlyPendingTimersAsync();

        await expect(resultPromise).rejects.toBe(chunkError);
        expect(calls).toBe(3);
      });
    });
  });

  describe('wrapRouteObjectLazyWithRetry', () => {
    it('wraps lazy and nested children', () => {
      const route: RouteObject = {
        path: 'parent',
        lazy: async () => ({ Component: () => null }),
        children: [
          {
            path: 'child',
            lazy: async () => ({ Component: () => null }),
          },
        ],
      };

      const wrapped = wrapRouteObjectLazyWithRetry(route);

      expect(wrapped.lazy).not.toBe(route.lazy);
      expect(wrapped.children?.[0].lazy).not.toBe(route.children?.[0].lazy);
    });
  });
});
