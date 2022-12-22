'use strict';

const { Readable } = require('stream');
const utils = require('../transfer/utils');

const mockDataTransfer = {
  createLocalFileDestinationProvider: jest.fn(),
  createLocalStrapiSourceProvider: jest.fn(),
  createTransferEngine() {
    return {
      transfer: jest.fn().mockReturnValue(Promise.resolve({})),
      progress: {
        on: jest.fn(),
        stream: Readable.from([1, 2, 3]),
      },
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

const exportCommand = require('../transfer/export');

const exit = jest.spyOn(process, 'exit').mockImplementation(() => {});
jest.spyOn(console, 'error').mockImplementation(() => {});

jest.mock('../transfer/utils');

const defaultFileName = 'defaultFilename';

describe('export', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('uses path provided by user', async () => {
    const filename = 'testfile';

    await exportCommand({ file: filename });

    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        file: { path: filename },
      })
    );
    expect(utils.getDefaultExportName).not.toHaveBeenCalled();
    expect(exit).toHaveBeenCalled();
  });

  it('uses default path if not provided by user', async () => {
    utils.getDefaultExportName.mockReturnValue(defaultFileName);

    await exportCommand({});

    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        file: { path: defaultFileName },
      })
    );

    expect(utils.getDefaultExportName).toHaveBeenCalled();
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
    const encrypt = true;

    await exportCommand({ encrypt, key });
    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        encryption: { enabled: encrypt, key },
      })
    );
    expect(exit).toHaveBeenCalled();
  });

  it('uses compress option', async () => {
    await exportCommand({ compress: false });
    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        compression: { enabled: false },
      })
    );
    await exportCommand({ compress: true });
    expect(mockDataTransfer.createLocalFileDestinationProvider).toHaveBeenCalledWith(
      expect.objectContaining({
        compression: { enabled: true },
      })
    );
    expect(exit).toHaveBeenCalled();
  });
});
