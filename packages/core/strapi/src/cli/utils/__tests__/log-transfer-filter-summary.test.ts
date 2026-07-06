import { logTransferFilterSummary } from '../data-transfer';

jest.mock('@strapi/core', () => ({
  createStrapi: jest.fn(),
  compileStrapi: jest.fn(),
}));

describe('logTransferFilterSummary', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => undefined);
  });

  afterEach(() => {
    logSpy.mockRestore();
  });

  test('does nothing when no exclude or only filters are set', () => {
    logTransferFilterSummary({});

    expect(logSpy).not.toHaveBeenCalled();
  });

  test('prints active filters when exclude is set', () => {
    logTransferFilterSummary({ exclude: ['config'] });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('excluding config'));
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('plugin::upload.file'));
  });

  test('prints files note when assets stage is skipped via --exclude files', () => {
    logTransferFilterSummary({ exclude: ['files'] });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('excluding files'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('plugin::upload.file'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('rsync'));
  });

  test('prints files note when assets stage is skipped via --only content', () => {
    logTransferFilterSummary({ only: ['content'] });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('only content'));
    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('plugin::upload.file'));
  });
});
