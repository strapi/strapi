import { Readable } from 'stream';
import { Duplex } from 'stream-chain';
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
  toHaveSourceStagesCalledOnce(provider: ISourceProvider) {
    const missing = sourceStages.filter((stage) => {
      if (provider[stage]) {
        try {
          expect(provider[stage]).toHaveBeenCalledTimes(1);
          return false;
        } catch (e) {
          return true;
        }
      }
    });

    if (missing.length) {
      return {
        pass: false,
        message: () => `Expected source provider to have stages called: ${missing.join(',')}`,
      };
    }
    return {
      pass: true,
      message: () => `Expected provider not to have all stages called`,
    };
  },
  toHaveDestinationStagesCalledOnce(provider: IDestinationProvider) {
    const missing = destinationStages.filter((stage) => {
      if (provider[stage]) {
        try {
          expect(provider[stage]).toHaveBeenCalledTimes(1);
          return false;
        } catch (e) {
          return true;
        }
      }
    });

    if (missing.length) {
      return {
        pass: false,
        message: () => `Expected destination provider to have stages called: ${missing.join(',')}`,
      };
    }
    return {
      pass: true,
      message: () => `Expected destination provider not to have all stages called`,
    };
  },
});

describe('Transfer engine', () => {
  // TODO: if these are needed for any other tests, a factory should be added to test-utils

  const minimalSource = {
    type: 'source',
    name: '',
    getMetadata: jest.fn() as any,
    getSchemas: jest.fn() as any,
  } as ISourceProvider;

  const minimalDestination = {
    type: 'source',
    name: '',
    getMetadata: jest.fn() as any,
    getSchemas: jest.fn() as any,
  } as IDestinationProvider;

  const completeSource = {
    type: 'source',
    name: '',
    getMetadata: jest.fn() as any,
    getSchemas: jest.fn() as any,

    bootstrap: jest.fn() as any,
    close: jest.fn() as any,

    streamEntities: jest.fn() as any,
    streamLinks: jest.fn() as any,
    streamMedia: jest.fn() as any,
    streamConfiguration: jest.fn() as any,
    streamSchemas: jest.fn() as any,
  } as ISourceProvider;

  const completeDestination = {
    type: 'source',
    name: '',
    getMetadata: jest.fn() as any,
    getSchemas: jest.fn() as any,

    bootstrap: jest.fn() as any,
    close: jest.fn() as any,

    getEntitiesStream: jest.fn() as any,
    getLinksStream: jest.fn() as any,
    getMediaStream: jest.fn() as any,
    getConfigurationStream: jest.fn() as any,
    getSchemasStream: jest.fn() as any,
  } as IDestinationProvider;

  const defaultOptions = {
    strategy: 'restore',
    versionMatching: 'exact',
    exclude: [],
  } as ITransferEngineOptions;

  let strapi = strapiFactory();

  beforeEach(() => {
    jest.resetAllMocks();
    strapi = strapiFactory();
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
  });

  describe('bootstrap', () => {
    test('works for providers without a bootstrap', async () => {
      const engine = createTransferEngine(minimalSource, minimalDestination, defaultOptions);
      expect(engine).toBeValidTransferEngine();
      await engine.transfer();
      expect(minimalSource).toHaveSourceStagesCalledOnce();
    });

    test('bootstraps all providers with a bootstrap', async () => {
      const source = {
        ...minimalSource,
        bootstrap: jest.fn().mockReturnValue(new Duplex()),
      };
      const destination = {
        ...minimalDestination,
        bootstrap: jest.fn().mockReturnValue(new Duplex()),
      };
      const engine = createTransferEngine(source, destination, defaultOptions);
      expect(engine).toBeValidTransferEngine();
      await engine.transfer();

      expect(minimalSource).toHaveSourceStagesCalledOnce();
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

    test.only('calls all provider stages', async () => {
      // TODO: use a source and destination that actually have all stages
      const engine = createTransferEngine(completeSource, completeSource, defaultOptions);
      await engine.transfer();

      expect(completeSource).toHaveSourceStagesCalledOnce();
      expect(completeDestination).toHaveDestinationStagesCalledOnce();
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
