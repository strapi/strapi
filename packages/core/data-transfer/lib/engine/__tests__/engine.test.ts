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
  'streamMedia',
  'streamConfiguration',
  'streamSchemas',
];
const destinationStages = [
  ...providerStages,
  'getEntitiesStream',
  'getLinksStream',
  'getMediaStream',
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
    try {
      sourceStages.forEach((stage) => {
        if (provider[stage]) {
          expect(provider[stage]).toHaveBeenCalledTimes(1);
        }
      });
    } catch (e) {
      return {
        pass: false,
        message: () => `Expected provider to have all stages called ${e.message}`,
      };
    }

    return {
      pass: true,
      message: () => `Expected provider not to have all stages called`,
    };
  },
  toHaveDestinationStagesCalledOnce(provider: IDestinationProvider) {
    try {
      destinationStages.forEach((stage) => {
        // only check the stages that exist
        if (provider[stage]) {
          expect(provider[stage]).toHaveBeenCalledTimes(1);
        }
      });
    } catch (e) {
      return {
        pass: false,
        message: () => `Expected provider to have all stages called`,
      };
    }

    return {
      pass: true,
      message: () => `Expected provider not to have all stages called`,
    };
  },
});

describe('Transfer engine', () => {
  // TODO: if these are needed for any other tests, a factory should be added to test-utils
  const mockedSource = {
    type: 'source',
    name: '',
    getMetadata: jest.fn() as any,
    getSchemas: jest.fn() as any,
  } as ISourceProvider;

  const mockedDestination = {
    type: 'source',
    name: '',
    getMetadata: jest.fn() as any,
    getSchemas: jest.fn() as any,
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
      const engine = createTransferEngine(mockedSource, mockedDestination, engineOptions);
      expect(engine).toBeValidTransferEngine();
    });
  });

  describe('bootstrap', () => {
    test('works for providers without a bootstrap', async () => {
      const engine = createTransferEngine(mockedSource, mockedDestination, defaultOptions);
      expect(engine).toBeValidTransferEngine();
      await engine.transfer();
      expect(mockedSource).toHaveSourceStagesCalledOnce();
    });

    test('bootstraps all providers with a bootstrap', async () => {
      const source = {
        ...mockedSource,
        bootstrap: jest.fn().mockReturnValue(new Duplex()),
      };
      const destination = {
        ...mockedDestination,
        bootstrap: jest.fn().mockReturnValue(new Duplex()),
      };
      const engine = createTransferEngine(source, destination, defaultOptions);
      expect(engine).toBeValidTransferEngine();
      await engine.transfer();

      expect(mockedSource).toHaveSourceStagesCalledOnce();
    });
  });

  describe('transfer', () => {
    test('requires strategy to be either restore or merge', async () => {
      const engineOptions = {
        versionMatching: 'exact',
        exclude: [],
      } as unknown as ITransferEngineOptions;

      const restoreEngine = createTransferEngine(mockedSource, mockedDestination, {
        ...engineOptions,
        strategy: 'restore',
      });
      await restoreEngine.transfer();
      expect(restoreEngine).toBeValidTransferEngine();

      const mergeEngine = createTransferEngine(mockedSource, mockedDestination, {
        ...engineOptions,
        strategy: 'merge',
      });
      await mergeEngine.transfer();
      expect(mergeEngine).toBeValidTransferEngine();

      // undefined strategy
      await expect(
        (async () => {
          const invalidEngine = createTransferEngine(
            mockedSource,
            mockedDestination,
            engineOptions
          );
          await invalidEngine.transfer();
        })()
      ).rejects.toThrow();

      // invalid strategy
      await expect(
        (async () => {
          const invalidEngine = createTransferEngine(mockedSource, mockedDestination, {
            ...engineOptions,
            strategy: 'foo',
          } as unknown as ITransferEngineOptions);
          await invalidEngine.transfer();
        })()
      ).rejects.toThrow();
    });

    test('calls all provider stages', async () => {
      const engine = createTransferEngine(mockedSource, mockedDestination, defaultOptions);

      await engine.transfer();

      expect(mockedSource).toHaveSourceStagesCalledOnce();
      expect(mockedDestination).toHaveDestinationStagesCalledOnce();
    });

    test.todo('returns provider results');
  });
  describe('progressStream', () => {
    test.todo('returns correct result count for each stage');
  });
});
