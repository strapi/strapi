'use strict';

const { expectExit } = require('../../../__tests__/commands.test.utils');

describe('Export', () => {
  const defaultFileName = 'defaultFilename';

  jest.mock('fs-extra', () => ({
    pathExists: jest.fn(() => Promise.resolve(true)),
  }));

  const mockDataTransfer = {
    file: {
      providers: {
        createLocalFileDestinationProvider: jest.fn().mockReturnValue({ name: 'testDest' }),
      },
    },
    strapi: {
      providers: {
        createLocalStrapiSourceProvider: jest.fn().mockReturnValue({ name: 'testSource' }),
      },
    },
    engine: {
      ...jest.requireActual('@strapi/data-transfer').engine,
      errors: {},
      createTransferEngine() {
        return {
          transfer: jest.fn(() => {
            return {
              engine: {},
              destination: {
                file: {
                  path: 'path',
                },
              },
            };
          }),
          progress: {
            on: jest.fn(),
            stream: {
              on: jest.fn(),
            },
          },
          sourceProvider: { name: 'testSource' },
          destinationProvider: { name: 'testDestination' },
          diagnostics: {
            on: jest.fn().mockReturnThis(),
            onDiagnostic: jest.fn().mockReturnThis(),
          },
        };
      },
    },
  };

  jest.mock('@strapi/data-transfer', () => mockDataTransfer);

  // command utils
  const mockUtils = {
    getTransferTelemetryPayload: jest.fn().mockReturnValue({}),
    loadersFactory: jest.fn().mockReturnValue({ updateLoader: jest.fn() }),
    formatDiagnostic: jest.fn(),
    createStrapiInstance() {
      return {
        telemetry: {
          send: jest.fn(),
        },
      };
    },
    getDefaultExportName: jest.fn(() => defaultFileName),
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

  // Now that everything is mocked, load the 'export' command
  const exportAction = require('../action');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses path provided by user', async () => {
    const filename = 'test';

    await expectExit(0, async () => {
      await exportAction({ file: filename });
    });

    expect(console.error).not.toHaveBeenCalled();
    expect(mockDataTransfer.file.providers.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        file: { path: filename },
      })
    );
    expect(mockUtils.getDefaultExportName).not.toHaveBeenCalled();
  });

  it('uses default path if not provided by user', async () => {
    await expectExit(0, async () => {
      await exportAction({});
    });

    expect(mockUtils.getDefaultExportName).toHaveBeenCalledTimes(1);
    expect(mockDataTransfer.file.providers.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        file: { path: defaultFileName },
      })
    );
  });

  it('encrypts the output file if specified', async () => {
    const encrypt = true;
    await expectExit(0, async () => {
      await exportAction({ encrypt });
    });

    expect(mockDataTransfer.file.providers.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        encryption: { enabled: encrypt },
      })
    );
  });

  it('encrypts the output file with the given key', async () => {
    const key = 'secret-key';
    const encrypt = true;
    await expectExit(0, async () => {
      await exportAction({ encrypt, key });
    });

    expect(mockDataTransfer.file.providers.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        encryption: { enabled: encrypt, key },
      })
    );
  });

  it('uses compress option', async () => {
    await expectExit(0, async () => {
      await exportAction({ compress: false });
    });

    expect(mockDataTransfer.file.providers.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        compression: { enabled: false },
      })
    );
    await expectExit(0, async () => {
      await exportAction({ compress: true });
    });
    expect(mockDataTransfer.file.providers.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        compression: { enabled: true },
      })
    );
  });
});
