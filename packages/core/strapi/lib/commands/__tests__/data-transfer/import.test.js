'use strict';

const {
  DEFAULT_CONFLICT_STRATEGY,
  DEFAULT_SCHEMA_STRATEGY,
  DEFAULT_VERSION_STRATEGY,
} = require('@strapi/data-transfer');

const { expectExit } = require('./shared/transfer.test.utils');

const createTransferEngine = jest.fn(() => {
  return {
    transfer: jest.fn().mockReturnValue(Promise.resolve({})),
    progress: {
      on: jest.fn(),
      stream: {
        on: jest.fn(),
      },
    },
    sourceProvider: { name: 'testFileSource', type: 'source', getMetadata: jest.fn() },
    destinationProvider: {
      name: 'testStrapiDest',
      type: 'destination',
      getMetadata: jest.fn(),
    },
  };
});

describe('Import', () => {
  const mockDataTransfer = {
    file: {
      providers: {
        createLocalFileSourceProvider: jest
          .fn()
          .mockReturnValue({ name: 'testFileSource', type: 'source', getMetadata: jest.fn() }),
      },
    },
    strapi: {
      providers: {
        createLocalStrapiDestinationProvider: jest
          .fn()
          .mockReturnValue({ name: 'testStrapiDest', type: 'destination', getMetadata: jest.fn() }),
      },
    },
    engine: {
      createTransferEngine,
    },
  };

  jest.mock('@strapi/data-transfer/lib/engine', () => mockDataTransfer.engine, { virtual: true });
  jest.mock('@strapi/data-transfer/lib/strapi', () => mockDataTransfer.strapi, { virtual: true });
  jest.mock('@strapi/data-transfer/lib/file', () => mockDataTransfer.file, { virtual: true });

  // mock utils
  const mockUtils = {
    createStrapiInstance: jest.fn().mockReturnValue({
      telemetry: {
        send: jest.fn(),
      },
      destroy: jest.fn(),
    }),
    buildTransferTable: jest.fn(() => 'table'),
  };
  jest.mock(
    '../../transfer/utils',
    () => {
      return mockUtils;
    },
    { virtual: true }
  );

  // other spies
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  // Now that everything is mocked, load the 'import' command
  const importCommand = require('../../transfer/import');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('creates providers with correct options ', async () => {
    const options = {
      file: 'test.tar.gz.enc',
      decrypt: true,
      decompress: true,
      exclude: [],
      only: [],
    };

    await expectExit(0, async () => {
      await importCommand(options);
    });

    // strapi options
    expect(
      mockDataTransfer.strapi.providers.createLocalStrapiDestinationProvider
    ).toHaveBeenCalledWith(expect.objectContaining({ strategy: DEFAULT_CONFLICT_STRATEGY }));

    // file options
    expect(mockDataTransfer.file.providers.createLocalFileSourceProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        file: { path: 'test.tar.gz.enc' },
        encryption: { enabled: options.decrypt },
        compression: { enabled: options.decompress },
      })
    );

    // engine options
    expect(mockDataTransfer.engine.createTransferEngine).toHaveBeenCalledWith(
      expect.objectContaining({ name: 'testFileSource' }),
      expect.objectContaining({ name: 'testStrapiDest' }),
      expect.objectContaining({
        schemaStrategy: DEFAULT_SCHEMA_STRATEGY,
        versionStrategy: DEFAULT_VERSION_STRATEGY,
      })
    );
  });
});
