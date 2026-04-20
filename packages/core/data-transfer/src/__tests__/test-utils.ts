import { Readable, Writable } from 'stream';
import { pipeline } from 'stream/promises';
import type { Core } from '@strapi/types';
import type { ITransferEngine, ISourceProvider, IDestinationProvider } from '../../types';

/**
 * Create a slow Writable that applies backpressure (low highWaterMark, delayed write).
 * Used to verify that source streams pause when the consumer is slow.
 */
export const createSlowWritable = <T = unknown>(
  options: {
    objectMode?: boolean;
    highWaterMark?: number;
    delayMs?: number;
    onChunk?: (chunk: T) => void;
  } = {}
): { writable: Writable; chunks: T[] } => {
  const { objectMode = true, highWaterMark = 1, delayMs = 10, onChunk } = options;
  const chunks: T[] = [];
  const writable = new Writable({
    objectMode,
    highWaterMark,
    write(chunk: T, _encoding, callback) {
      chunks.push(chunk);
      onChunk?.(chunk);
      setTimeout(callback, delayMs);
    },
  });
  return { writable, chunks };
};

/**
 * Run a backpressure test on a Readable: pipe to a slow consumer and assert the source stream
 * was paused at least once (proving backpressure is applied). Returns collected chunks for integrity checks.
 */
export const assertReadStreamBackpressure = async <T = unknown>(
  stream: Readable,
  options: { delayMs?: number; minChunksForBackpressure?: number } = {}
): Promise<{ sourcePaused: boolean; chunks: T[] }> => {
  const { delayMs = 10, minChunksForBackpressure } = options;
  let sourcePaused = false;
  const originalPause = stream.pause.bind(stream);
  stream.pause = function (this: Readable) {
    sourcePaused = true;
    return originalPause();
  };

  const { writable, chunks } = createSlowWritable<T>({ delayMs, highWaterMark: 1 });
  await pipeline(stream, writable);

  if (minChunksForBackpressure !== undefined && chunks.length < minChunksForBackpressure) {
    throw new Error(
      `assertReadStreamBackpressure: need at least ${minChunksForBackpressure} chunk(s) to meaningfully test backpressure, got ${chunks.length}`
    );
  }

  return {
    sourcePaused,
    chunks,
  };
};

/**
 * Run a backpressure test on a Writable: pipe a fast Readable (many chunks) into it and assert
 * the readable was paused (proving the destination applies backpressure).
 */
export const assertWriteStreamBackpressure = async <T = unknown>(
  writable: Writable,
  chunks: T[]
): Promise<{ sourcePaused: boolean }> => {
  const source = Readable.from(chunks, { objectMode: true });
  let sourcePaused = false;
  const originalPause = source.pause.bind(source);
  source.pause = function (this: Readable) {
    sourcePaused = true;
    return originalPause();
  };
  await pipeline(source, writable);
  return { sourcePaused };
};

/**
 * Collect every entity in a Readable stream
 */
export const collect = <T = unknown>(stream: Readable): Promise<T[]> => {
  const chunks: T[] = [];

  return new Promise((resolve, reject) => {
    stream
      .on('data', (chunk) => chunks.push(chunk))
      .on('close', () => {
        resolve(chunks);
      })
      .on('error', reject);
  });
};

/**
 * Create a "Strapi" like object factory based on the
 * given params and cast it to the correct type
 */
export const getStrapiFactory =
  <
    T extends {
      [key in keyof Partial<Core.Strapi>]: unknown;
    },
  >(
    properties?: T
  ) =>
  (additionalProperties?: Partial<T>) => {
    return { ...properties, ...additionalProperties } as Core.Strapi;
  };

/**
 * Union type used to represent the default content types available
 */
export type ContentType = 'foo' | 'bar';

/**
 * Factory to get default content types test values
 */
export const getContentTypes = (): {
  [key in ContentType]: { uid: key; attributes: { [attribute: string]: unknown } };
} => ({
  foo: { uid: 'foo', attributes: { title: { type: 'string' } } },
  bar: { uid: 'bar', attributes: { age: { type: 'number' } } },
});

/**
 * Factory to get default strapi models test values
 */
export const getStrapiModels = () => {
  return [{ uid: 'model::foo' }, { uid: 'model::bar' }];
};

/**
 * Create a factory of readable streams (wrapped with a jest mock function)
 */
export const createMockedReadableFactory = <T extends string = ContentType>(source: {
  [ct in T]: Array<{ id: number; [key: string]: unknown }>;
}) =>
  jest.fn((uid: T) => {
    return Readable.from(source[uid] || []);
  });

/**
 * Create a factory of mocked query builders
 */
export const createMockedQueryBuilder = <T extends string = ContentType>(data: {
  [key in T]: unknown[];
}) =>
  jest.fn((uid: T) => {
    const state: { [key: string]: unknown } = { populate: undefined, select: undefined };

    return {
      select(fields: string | string[]) {
        state.fields = fields;
        return this;
      },
      populate(populate: unknown) {
        state.populate = populate;
        return this;
      },
      stream() {
        return Readable.from(data[uid]);
      },
    };
  });

export const providerStages = ['bootstrap', 'close'];

export const sourceStages = [
  ...providerStages,
  'streamEntities',
  'streamLinks',
  'streamAssets',
  'streamConfiguration',
  'streamSchemas',
];

export const destinationStages = [
  ...providerStages,
  'getEntitiesStream',
  'getLinksStream',
  'getAssetsStream',
  'getConfigurationStream',
  'getSchemasStream',
];

/**
 * Update the global store with the given strapi value
 */
export const setGlobalStrapi = (strapi: Core.Strapi): void => {
  (global as unknown as Global).strapi = strapi;
};

/**
 * Add jest expect helpers
 */
export const extendExpectForDataTransferTests = () => {
  expect.extend({
    toBeValidTransferEngine(engine: ITransferEngine) {
      try {
        expect(engine).toBeDefined();

        expect(engine.sourceProvider).toBeValidSourceProvider();
        expect(engine.destinationProvider).toBeValidDestinationProvider();

        // All required methods exists
        expect(engine.integrityCheck).toBeInstanceOf(Function);
        expect(engine.transfer).toBeInstanceOf(Function);
        expect(engine.bootstrap).toBeInstanceOf(Function);
        expect(engine.close).toBeInstanceOf(Function);
        expect(engine.transferSchemas).toBeInstanceOf(Function);
        expect(engine.transferEntities).toBeInstanceOf(Function);
        expect(engine.transferLinks).toBeInstanceOf(Function);
        expect(engine.transferAssets).toBeInstanceOf(Function);
        expect(engine.transferConfiguration).toBeInstanceOf(Function);
        expect(engine.close).toBeInstanceOf(Function);
        expect(engine.transfer).toBeInstanceOf(Function);
      } catch (e) {
        return {
          pass: false,
          message: () => `Expected engine to be valid: ${e.message}`,
        };
      }
      return {
        pass: true,
        message: () => 'Expected engine not to be valid',
      };
    },
    toHaveSourceStagesCalledTimes(
      provider: ISourceProvider,
      stages: (keyof ISourceProvider)[],
      times: number
    ) {
      try {
        stages.forEach((stage) => {
          expect(provider[stage as string].mock.results.length).toEqual(times);
        });
        return {
          pass: true,
          message: () => 'Expected source provider not to have all stages called',
        };
      } catch (e) {
        return {
          pass: false,
          message: () =>
            `Expected destination sources to have stages ${stages} called ${times} times`,
        };
      }
    },
    toHaveAllSourceStagesCalledTimes(provider: ISourceProvider, times: number) {
      const missing = sourceStages.filter((stage) => {
        if (provider[stage]) {
          try {
            // TODO: why is mock.calls an empty array? maybe an async function call that doesn't resolve?
            // expect(provider[stage]).toHaveBeenCalledOnce();
            expect(provider[stage].mock.results.length).toEqual(times);
            return false;
          } catch (e) {
            return true;
          }
        }
        return false;
      });

      if (missing.length) {
        return {
          pass: false,
          message: () =>
            `Expected source provider to have stages called ${times} times: ${missing.join(',')}`,
        };
      }
      return {
        pass: true,
        message: () => 'Expected source provider not to have all stages called',
      };
    },
    toHaveDestinationStagesCalledTimes(
      provider: IDestinationProvider,
      stages: (keyof IDestinationProvider)[],
      times = 1
    ) {
      try {
        stages.forEach((stage) => {
          expect(provider[stage as string].mock.results.length).toEqual(times);
        });
        return {
          pass: true,
          message: () => 'Expected destination provider not to have all stages called',
        };
      } catch (e) {
        return {
          pass: false,
          message: () =>
            `Expected destination provider to have stages ${stages} called ${times} times`,
        };
      }
    },
    toHaveAllDestinationStagesCalledTimes(provider: IDestinationProvider, times: number) {
      const missing = destinationStages.filter((stage) => {
        if (provider[stage]) {
          try {
            // TODO: why is mock.calls an empty array? maybe an async function call that doesn't resolve?
            // expect(provider[stage]).toHaveBeenCalledOnce();
            expect(provider[stage].mock.results.length).toEqual(times);
            return false;
          } catch (e) {
            return true;
          }
        }

        return false;
      });

      if (missing.length) {
        return {
          pass: false,
          message: () =>
            `Expected destination provider to have stages called ${times} times: ${missing.join(
              ','
            )}`,
        };
      }
      return {
        pass: true,
        message: () => 'Expected destination provider not to have all stages called',
      };
    },
    toBeValidSourceProvider(provider: ISourceProvider) {
      try {
        expect(provider.getMetadata).toBeDefined();
        expect(provider.type).toEqual('source');
        expect(provider.name.length).toBeGreaterThan(0);
      } catch (e) {
        return {
          pass: false,
          message: () => `Expected source provider to be valid: ${e.message}`,
        };
      }
      return {
        pass: true,
        message: () => 'Expected source provider not to be valid',
      };
    },
    toBeValidDestinationProvider(provider: IDestinationProvider) {
      try {
        expect(provider.getMetadata).toBeDefined();
        expect(provider.type).toEqual('destination');
        expect(provider.name.length).toBeGreaterThan(0);
      } catch (e) {
        return {
          pass: false,
          message: () => `Expected destination provider to be valid: ${e.message}`,
        };
      }
      return {
        pass: true,
        message: () => 'Expected destination provider not to be valid',
      };
    },
  });
};
