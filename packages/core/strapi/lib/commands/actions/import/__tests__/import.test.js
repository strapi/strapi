'use strict';

const {
  strapi: {
    providers: { DEFAULT_CONFLICT_STRATEGY },
  },
  engine: { DEFAULT_SCHEMA_STRATEGY, DEFAULT_VERSION_STRATEGY },
} = require('@strapi/data-transfer');

const { expectExit } = require('../../../__tests__/commands.test.utils');

const createTransferEngine = jest.fn(() => {
  return {
    transfer: jest.fn(() => {
      return {
        engine: {},
      };
    }),
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
    diagnostics: {
      on: jest.fn().mockReturnThis(),
      onDiagnostic: jest.fn().mockReturnThis(),
    },
    onSchemaDiff: jest.fn(),
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
        DEFAULT_CONFLICT_STRATEGY,
        createLocalStrapiDestinationProvider: jest
          .fn()
          .mockReturnValue({ name: 'testStrapiDest', type: 'destination', getMetadata: jest.fn() }),
      },
    },
    engine: {
      ...jest.requireActual('@strapi/data-transfer').engine,
      DEFAULT_SCHEMA_STRATEGY,
      DEFAULT_VERSION_STRATEGY,
      createTransferEngine,
    },
  };

  jest.mock('@strapi/data-transfer', () => mockDataTransfer);

  // command utils
  const mockUtils = {
    getTransferTelemetryPayload: jest.fn().mockReturnValue({}),
    loadersFactory: jest.fn().mockReturnValue({ updateLoader: jest.fn() }),
    formatDiagnostic: jest.fn(),
    createStrapiInstance: jest.fn().mockReturnValue({
      telemetry: {
        send: jest.fn(),
      },
      destroy: jest.fn(),
    }),
    buildTransferTable: jest.fn(() => {
      return {
        toString() {
          return 'table';
        },
      };
    }),
    exitMessageText: jest.fn(),
    getDiffHandler: jest.fn(),
    setSignalHandler: jest.fn(),
  };
  jest.mock(
    '../../../utils/data-transfer.js',
    () => {
      return mockUtils;
    },
    { virtual: true }
  );

  // console spies
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  // Now that everything is mocked, load the 'import' command
  const importAction = require('../action');

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
      await importAction(options);
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
