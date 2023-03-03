'use strict';

const { expectExit } = require('./shared/transfer.test.utils');

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

  // mock utils
  const mockUtils = {
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
  };
  jest.mock(
    '../../transfer/utils',
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
  const exportCommand = require('../../transfer/export');

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('uses path provided by user', async () => {
    const filename = 'test';

    await expectExit(0, async () => {
      await exportCommand({ file: filename });
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
      await exportCommand({});
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
      await exportCommand({ encrypt });
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
      await exportCommand({ encrypt, key });
    });

    expect(mockDataTransfer.file.providers.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        encryption: { enabled: encrypt, key },
      })
    );
  });

  it('uses compress option', async () => {
    await expectExit(0, async () => {
      await exportCommand({ compress: false });
    });

    expect(mockDataTransfer.file.providers.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        compression: { enabled: false },
      })
    );
    await expectExit(0, async () => {
      await exportCommand({ compress: true });
    });
    expect(mockDataTransfer.file.providers.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        compression: { enabled: true },
      })
    );
  });
});
