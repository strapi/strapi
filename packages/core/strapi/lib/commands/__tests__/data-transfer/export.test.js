'use strict';

describe('export', () => {
  const defaultFileName = 'defaultFilename';

  // mock @strapi/data-transfer
  const mockDataTransfer = {
    createLocalFileDestinationProvider: jest.fn().mockReturnValue({ name: 'testDest' }),
    createLocalStrapiSourceProvider: jest.fn().mockReturnValue({ name: 'testSource' }),
    createTransferEngine() {
      return {
        transfer: jest.fn().mockReturnValue(Promise.resolve({})),
        progress: {
          on: jest.fn(),
          stream: {
            on: jest.fn(),
          },
        },
        sourceProvider: { name: 'testSource' },
        destinationProvider: { name: 'testDestination' },
      };
    },
  };
  jest.mock(
    '@strapi/data-transfer',
    () => {
      return mockDataTransfer;
    },
    { virtual: true }
  );

  // mock utils
  const mockUtils = {
    createStrapiInstance() {
      return {
        telemetry: {
          send: jest.fn(),
        },
      };
    },
    getDefaultExportName: jest.fn(() => defaultFileName),
  };
  jest.mock(
    '../transfer/utils',
    () => {
      return mockUtils;
    },
    { virtual: true }
  );

  // other spies=
  jest.spyOn(console, 'log').mockImplementation(() => {});
  jest.spyOn(console, 'warn').mockImplementation(() => {});
  jest.spyOn(console, 'error').mockImplementation(() => {});

  // Now that everything is mocked, import export command
  const exportCommand = require('../../transfer/export');

  const expectExit = async (code, fn) => {
    const exit = jest.spyOn(process, 'exit').mockImplementation((number) => {
      throw new Error(`process.exit: ${number}`);
    });
    await expect(async () => {
      await fn();
    }).rejects.toThrow();
    expect(exit).toHaveBeenCalledWith(code);
    exit.mockRestore();
  };

  beforeEach(() => {});

  it('uses path provided by user', async () => {
    const filename = 'test';

    await expectExit(1, async () => {
      await exportCommand({ file: filename });
    });

    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        file: { path: filename },
      })
    );
    expect(mockUtils.getDefaultExportName).not.toHaveBeenCalled();
  });

  it('uses default path if not provided by user', async () => {
    await expectExit(1, async () => {
      await exportCommand({});
    });

    expect(mockUtils.getDefaultExportName).toHaveBeenCalledTimes(1);
    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        file: { path: defaultFileName },
      })
    );
  });

  it('encrypts the output file if specified', async () => {
    const encrypt = true;
    await expectExit(1, async () => {
      await exportCommand({ encrypt });
    });

    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        encryption: { enabled: encrypt },
      })
    );
  });

  it('encrypts the output file with the given key', async () => {
    const key = 'secret-key';
    const encrypt = true;
    await expectExit(1, async () => {
      await exportCommand({ encrypt, key });
    });

    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        encryption: { enabled: encrypt, key },
      })
    );
  });

  it('uses compress option', async () => {
    await expectExit(1, async () => {
      await exportCommand({ compress: false });
    });

    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        compression: { enabled: false },
      })
    );
    await expectExit(1, async () => {
      await exportCommand({ compress: true });
    });
    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        compression: { enabled: true },
      })
    );
  });
});
