'use strict';

const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

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

const defaultFileName = 'defaultFilename';
const mockUtils = {
  getDefaultExportBackupName: jest.fn().mockReturnValue(defaultFileName),
};
jest.mock('../transfer/utils', () => {
  return mockUtils;
});

const exportCommand = require('../transfer/export');
const { getDefaultExportBackupName } = require('../transfer/utils');

describe('export', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('uses path provided by user', async () => {
    const filename = 'testfile';
    await exportCommand({ output: filename });
    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        file: { path: filename },
      })
    );

    expect(getDefaultExportBackupName).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalled();
  });

  it('uses default path if not provided by user', async () => {
    await exportCommand({});
    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        file: { path: defaultFileName },
      })
    );

    expect(getDefaultExportBackupName).toHaveBeenCalled();
    expect(exit).toHaveBeenCalled();
  });
});
