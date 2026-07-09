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

  test('does not print files note when content is also skipped via --only config', () => {
    logTransferFilterSummary({ only: ['config'] });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('only config'));
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('plugin::upload.file'));
  });

  test('does not print files note when content is also skipped via --exclude files,content', () => {
    logTransferFilterSummary({ exclude: ['files', 'content'] });

    expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('excluding files, content'));
    expect(logSpy).not.toHaveBeenCalledWith(expect.stringContaining('plugin::upload.file'));
  });

  test('prints content type filters when exclude-content-types is set', () => {
    logTransferFilterSummary({
      excludeContentTypes: ['plugin::upload.file', 'plugin::upload.folder'],
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Content type filters: excluding plugin::upload.file, plugin::upload.folder'
      )
    );
  });

  test('prints content type filters when only-content-types is set', () => {
    logTransferFilterSummary({
      onlyContentTypes: ['api::article.article', 'api::category.category'],
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining(
        'Content type filters: only api::article.article, api::category.category'
      )
    );
  });

  test('prints stage and content type filters on separate lines', () => {
    logTransferFilterSummary({
      exclude: ['files'],
      onlyContentTypes: ['api::article.article'],
    });

    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Transfer filters: excluding files')
    );
    expect(logSpy).toHaveBeenCalledWith(
      expect.stringContaining('Content type filters: only api::article.article')
    );
  });
});
