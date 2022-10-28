'use strict';

const utils = require('../transfer/utils');

const mockDataTransfer = {
  createLocalFileDestinationProvider: jest.fn(),
  createLocalStrapiSourceProvider: jest.fn(() => {}),
  createTransferEngine: jest.fn().mockReturnValue({
    transfer: jest.fn().mockReturnValue(Promise.resolve({})),
  }),
};

jest.mock('@strapi/data-transfer', () => {
  return mockDataTransfer;
});

const exportCommand = require('../transfer/export');

const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

const defaultFileName = 'defaultFilename';

jest.mock('../transfer/utils');

describe('export', () => {
  beforeEach(() => {
    jest.resetAllMocks();
    utils.getDefaultExportBackupName.mockReturnValue(defaultFileName);
  });

  it('uses path provided by user', async () => {
    const filename = 'testfile';
    await exportCommand({ output: filename });
    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        file: { path: filename },
      })
    );
    expect(utils.getDefaultExportBackupName).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalled();
  });

  it('uses default path if not provided by user', async () => {
    await exportCommand({});
    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        file: { path: defaultFileName },
      })
    );

    expect(utils.getDefaultExportBackupName).toHaveBeenCalled();
    expect(exit).toHaveBeenCalled();
  });

  it('encrypts the output file if specified', async () => {
    const encrypt = true;
    await exportCommand({ encrypt });
    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        encryption: { enabled: encrypt },
      })
    );
    expect(exit).toHaveBeenCalled();
  });

  it('encrypts the output file with the given key', async () => {
    const key = 'secret-key';
    await exportCommand({ key });
    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        encryption: { key },
      })
    );
    expect(exit).toHaveBeenCalled();
  });

  it('compresses the output file if specified', async () => {
    const compress = true;
    await exportCommand({ compress });
    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        compression: { enabled: compress },
      })
    );
    expect(exit).toHaveBeenCalled();
  });
});
