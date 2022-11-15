import { Readable } from 'stream';
import { Duplex } from 'stream-chain';
import { createTransferEngine } from '..';
import { IDestinationProvider, ISourceProvider, ITransferEngineOptions } from '../../../types';

import { collect, createMockedQueryBuilder, getStrapiFactory } from '../../__tests__/test-utils';

const strapiFactory = getStrapiFactory();

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
    });
  });

  describe('bootstrap', () => {
    test('works for providers without a bootstrap', async () => {
      const engine = createTransferEngine(mockedSource, mockedDestination, defaultOptions);

      await engine.transfer();
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

      await engine.transfer();

      expect(source.bootstrap).toHaveBeenCalledTimes(1);
      expect(destination.bootstrap).toHaveBeenCalledTimes(1);
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

      const mergeEngine = createTransferEngine(mockedSource, mockedDestination, {
        ...engineOptions,
        strategy: 'merge',
      });
      await mergeEngine.transfer();

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
    });
  });
});
