import importAction from '../action';
import * as mockDataTransfer from '../../..';
import { expectExit } from '../../__tests__/commands.test.utils';

jest.mock('../../data-transfer', () => {
  return {
    ...jest.requireActual('../../data-transfer'),
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
});

jest.mock('../../..', () => {
  const actual = jest.requireActual('../../..');

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

  return {
    file: {
      providers: {
        createLocalFileSourceProvider: jest
          .fn()
          .mockReturnValue({ name: 'testFileSource', type: 'source', getMetadata: jest.fn() }),
      },
    },
    strapi: {
      providers: {
        DEFAULT_CONFLICT_STRATEGY: actual.strapi.providers.DEFAULT_CONFLICT_STRATEGY,
        createLocalStrapiDestinationProvider: jest
          .fn()
          .mockReturnValue({ name: 'testStrapiDest', type: 'destination', getMetadata: jest.fn() }),
      },
    },
    engine: {
      ...jest.requireActual('@strapi/data-transfer').engine,
      DEFAULT_SCHEMA_STRATEGY: actual.engine.DEFAULT_SCHEMA_STRATEGY,
      DEFAULT_VERSION_STRATEGY: actual.engine.DEFAULT_VERSION_STRATEGY,
      createTransferEngine,
    },
  };
});

describe('Import', () => {
  // mock command utils

  // console spies
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'info').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

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
    ).toHaveBeenCalledWith(
      expect.objectContaining({
        strategy: mockDataTransfer.strapi.providers.DEFAULT_CONFLICT_STRATEGY,
      })
    );

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
        schemaStrategy: mockDataTransfer.engine.DEFAULT_SCHEMA_STRATEGY,
        versionStrategy: mockDataTransfer.engine.DEFAULT_VERSION_STRATEGY,
      })
    );
  });
});
