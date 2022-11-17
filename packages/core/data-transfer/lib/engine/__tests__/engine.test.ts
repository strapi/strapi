import { ObjectWritableMock, ObjectReadableMock } from 'stream-mock';
import { createTransferEngine } from '..';
import {
  IDestinationProvider,
  ISourceProvider,
  ITransferEngine,
  ITransferEngineOptions,
} from '../../../types';

import { getStrapiFactory } from '../../__tests__/test-utils';

const strapiFactory = getStrapiFactory({});

const providerStages = ['bootstrap', 'close'];

const getMockSourceStream = (data: Iterable<any> = ['foo', 'bar']) => {
  const stream = new ObjectReadableMock(data).on('close', () => {
    stream.destroy();
  });

  return stream;
};

const getMockDestinationStream = () => {
  const stream = new ObjectWritableMock().on('close', () => {
    stream.destroy();
  });
  return stream;
};

const sourceStages = [
  ...providerStages,
  'streamEntities',
  'streamLinks',
  // 'streamMedia',
  'streamConfiguration',
  'streamSchemas',
];

const destinationStages = [
  ...providerStages,
  'getEntitiesStream',
  'getLinksStream',
  // 'getMediaStream',
  'getConfigurationStream',
  'getSchemasStream',
];

// add some helpers to jest
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
      expect(engine.transferMedia).toBeInstanceOf(Function);
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
      message: () => `Expected engine not to be valid`,
    };
  },
  toHaveSourceStagesCalledTimes(provider: ISourceProvider, times: number) {
    const missing = sourceStages.filter((stage) => {
      if (provider[stage]) {
        try {
          // TODO: why is mock.calls an empty array? maybe an async function call that doesn't resolve?
          // expect(provider[stage]).toHaveBeenCalledOnce();
          expect(provider[stage].mock.results.length).toEqual(1);
          return false;
        } catch (e) {
          return true;
        }
      }
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
      message: () => `Expected source provider not to have all stages called`,
    };
  },
  toHaveDestinationStagesCalledTimes(provider: IDestinationProvider, times: number) {
    const missing = destinationStages.filter((stage) => {
      if (provider[stage]) {
        try {
          // expect(provider[stage]).toHaveBeenCalledOnce();
          expect(provider[stage].mock.results.length).toEqual(1);
          return false;
        } catch (e) {
          return true;
        }
      }
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
      message: () => `Expected destination provider not to have all stages called`,
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
      message: () => `Expected source provider not to be valid`,
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
      message: () => `Expected destination provider not to be valid`,
    };
  },
});

const createSource = () => {
  return {
    type: 'source',
    name: 'completeSource',
    getMetadata: jest.fn() as any,
    getSchemas: jest.fn() as any,

    bootstrap: jest.fn() as any,
    close: jest.fn() as any,

    streamEntities: jest.fn().mockResolvedValue(getMockSourceStream()) as any,
    streamLinks: jest.fn().mockResolvedValue(getMockSourceStream()) as any,
    streamMedia: jest.fn().mockResolvedValue(getMockSourceStream()) as any,
    streamConfiguration: jest.fn().mockResolvedValue(getMockSourceStream()) as any,
    streamSchemas: jest.fn().mockReturnValue(getMockSourceStream()) as any,
  } as ISourceProvider;
};

const createDestination = () => {
  return {
    type: 'destination',
    name: 'completeDestination',
    getMetadata: jest.fn() as any,
    getSchemas: jest.fn() as any,

    bootstrap: jest.fn() as any,
    close: jest.fn() as any,

    getEntitiesStream: jest.fn().mockResolvedValue(getMockDestinationStream()) as any,
    getLinksStream: jest.fn().mockResolvedValue(getMockDestinationStream()) as any,
    getMediaStream: jest.fn().mockResolvedValue(getMockDestinationStream()) as any,
    getConfigurationStream: jest.fn().mockResolvedValue(getMockDestinationStream()) as any,
    getSchemasStream: jest.fn().mockResolvedValue(getMockDestinationStream()) as any,
  } as IDestinationProvider;
};

describe('Transfer engine', () => {
  // TODO: if these are needed for any other tests, a factory should be added to test-utils

  const minimalSource = {
    type: 'source',
    name: 'minimalSource',
    getMetadata: jest.fn() as any,
    getSchemas: jest.fn() as any,
  } as ISourceProvider;

  const minimalDestination = {
    type: 'destination',
    name: 'minimalDestination',
    getMetadata: jest.fn() as any,
    getSchemas: jest.fn() as any,
  } as IDestinationProvider;

  const defaultOptions = {
    strategy: 'restore',
    versionMatching: 'exact',
    exclude: [],
  } as ITransferEngineOptions;

  let strapi = strapiFactory();

  let completeSource;
  let completeDestination;

  beforeEach(() => {
    jest.restoreAllMocks();
    strapi = strapiFactory();
    completeSource = createSource();
    completeDestination = createDestination();
  });

  describe('createTransferEngine', () => {
    test('creates a valid transfer engine', () => {
      const engineOptions = {
        strategy: 'restore',
        versionMatching: 'exact',
        exclude: [],
      } as ITransferEngineOptions;
      const engine = createTransferEngine(minimalSource, minimalDestination, engineOptions);
      expect(engine).toBeValidTransferEngine();
    });

    test('throws when given invalid source provider', () => {
      const engineOptions = {
        strategy: 'restore',
        versionMatching: 'exact',
        exclude: [],
      } as ITransferEngineOptions;
      expect(() => {
        createTransferEngine(completeDestination, minimalDestination, engineOptions);
      }).toThrow();
    });

    test('throws when given invalid destination provider', () => {
      const engineOptions = {
        strategy: 'restore',
        versionMatching: 'exact',
        exclude: [],
      } as ITransferEngineOptions;
      expect(() => {
        createTransferEngine(minimalSource, completeSource, engineOptions);
      }).toThrow();
    });
  });

  describe('bootstrap', () => {
    test('works for providers without a bootstrap', async () => {
      const engine = createTransferEngine(minimalSource, minimalDestination, defaultOptions);
      expect(engine).toBeValidTransferEngine();
      await engine.transfer();
      expect(minimalSource).toHaveSourceStagesCalledTimes(1);
    });

    test('bootstraps all providers with a bootstrap', async () => {
      const source = {
        ...minimalSource,
        bootstrap: jest.fn().mockResolvedValue(true),
      };
      const destination = {
        ...minimalDestination,
        bootstrap: jest.fn().mockResolvedValue(true),
      };
      const engine = createTransferEngine(source, destination, defaultOptions);
      expect(engine).toBeValidTransferEngine();
      await engine.transfer();

      expect(minimalSource).toHaveSourceStagesCalledTimes(1);
    });
  });

  describe('transfer', () => {
    test('requires strategy to be either restore or merge', async () => {
      const engineOptions = {
        versionMatching: 'exact',
        exclude: [],
      } as unknown as ITransferEngineOptions;

      const restoreEngine = createTransferEngine(minimalSource, minimalDestination, {
        ...engineOptions,
        strategy: 'restore',
      });
      await restoreEngine.transfer();
      expect(restoreEngine).toBeValidTransferEngine();

      const mergeEngine = createTransferEngine(minimalSource, minimalDestination, {
        ...engineOptions,
        strategy: 'merge',
      });
      await mergeEngine.transfer();
      expect(mergeEngine).toBeValidTransferEngine();

      // undefined strategy
      await expect(
        (async () => {
          const invalidEngine = createTransferEngine(
            minimalSource,
            minimalDestination,
            engineOptions
          );
          await invalidEngine.transfer();
        })()
      ).rejects.toThrow();

      // invalid strategy
      await expect(
        (async () => {
          const invalidEngine = createTransferEngine(minimalSource, minimalDestination, {
            ...engineOptions,
            strategy: 'foo',
          } as unknown as ITransferEngineOptions);
          await invalidEngine.transfer();
        })()
      ).rejects.toThrow();
    });

    test('calls all provider stages', async () => {
      const engine = createTransferEngine(completeSource, completeDestination, defaultOptions);
      expect(completeSource).not.toHaveSourceStagesCalledTimes(1);
      expect(completeDestination).not.toHaveDestinationStagesCalledTimes(1);
      await engine.transfer();

      expect(completeSource).toHaveSourceStagesCalledTimes(1);
      expect(completeDestination).toHaveDestinationStagesCalledTimes(1);
    });

    test('returns provider results', async () => {
      const source = {
        ...minimalSource,
        results: { foo: 'bar' },
      };
      const destination = {
        ...minimalDestination,
        results: { foo: 'baz' },
      };

      const engine = createTransferEngine(source, destination, defaultOptions);
      const results = await engine.transfer();
      expect(results).toMatchObject({
        source: { foo: 'bar' },
        destination: { foo: 'baz' },
      });
    });
  });

  describe('progressStream', () => {
    test.todo('returns correct result count for each stage');
  });
});
