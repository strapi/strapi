import {
  normalizeTransferFilterOptions,
  areUploadContentTypesInTransferScope,
  areAllUploadContentTypesOutOfTransferScope,
  UPLOAD_CONTENT_TYPE_UIDS,
} from '../data-transfer';

jest.mock('@strapi/core', () => ({
  createStrapi: jest.fn(),
  compileStrapi: jest.fn(),
}));

describe('normalizeTransferFilterOptions', () => {
  test('expands --exclude media-library into files and upload content types', () => {
    const opts = normalizeTransferFilterOptions({
      exclude: ['media-library'],
    });

    expect(opts.exclude).toEqual(['files']);
    expect(opts.excludeContentTypes).toEqual([...UPLOAD_CONTENT_TYPE_UIDS]);
  });

  test('merges media-library with existing exclude-content-types', () => {
    const opts = normalizeTransferFilterOptions({
      exclude: ['media-library'],
      excludeContentTypes: ['api::article.article'],
    });

    expect(opts.exclude).toEqual(['files']);
    expect(opts.excludeContentTypes).toEqual(
      expect.arrayContaining(['api::article.article', ...UPLOAD_CONTENT_TYPE_UIDS])
    );
  });

  test('auto-excludes files when upload types are out of scope via only-content-types', () => {
    const opts = normalizeTransferFilterOptions({
      onlyContentTypes: ['api::article.article'],
    });

    expect(opts.exclude).toEqual(['files']);
    expect(opts.filesAutoExcluded).toBe(true);
    expect(areUploadContentTypesInTransferScope(opts)).toBe(false);
  });

  test('auto-excludes files when both upload types are excluded', () => {
    const opts = normalizeTransferFilterOptions({
      excludeContentTypes: [...UPLOAD_CONTENT_TYPE_UIDS],
    });

    expect(opts.exclude).toEqual(['files']);
    expect(opts.filesAutoExcluded).toBe(true);
  });

  test('does not auto-exclude files when only one upload type is excluded', () => {
    const opts = normalizeTransferFilterOptions({
      excludeContentTypes: ['plugin::upload.file'],
    });

    expect(opts.exclude).toBeUndefined();
    expect(opts.filesAutoExcluded).toBeUndefined();
  });

  test('does not auto-exclude files when only one upload type is in scope', () => {
    const opts = normalizeTransferFilterOptions({
      onlyContentTypes: ['plugin::upload.file'],
    });

    expect(opts.exclude).toBeUndefined();
    expect(opts.filesAutoExcluded).toBeUndefined();
    expect(areUploadContentTypesInTransferScope(opts)).toBe(false);
    expect(areAllUploadContentTypesOutOfTransferScope(opts)).toBe(false);
  });

  test('does not auto-exclude files when content stage is inactive', () => {
    const opts = normalizeTransferFilterOptions({
      only: ['config'],
      onlyContentTypes: ['api::article.article'],
    });

    expect(opts.exclude).toBeUndefined();
    expect(opts.filesAutoExcluded).toBeUndefined();
  });

  test('does not auto-exclude files when user explicitly requests files stage', () => {
    const opts = normalizeTransferFilterOptions({
      only: ['files'],
      onlyContentTypes: ['api::article.article'],
    });

    expect(opts.exclude).toBeUndefined();
    expect(opts.filesAutoExcluded).toBeUndefined();
  });

  test('does not auto-exclude files when upload types remain in scope', () => {
    const opts = normalizeTransferFilterOptions({
      onlyContentTypes: ['api::article.article', ...UPLOAD_CONTENT_TYPE_UIDS],
    });

    expect(opts.exclude).toBeUndefined();
    expect(opts.filesAutoExcluded).toBeUndefined();
    expect(areUploadContentTypesInTransferScope(opts)).toBe(true);
  });

  test('is idempotent when called twice', () => {
    const opts = normalizeTransferFilterOptions({
      onlyContentTypes: ['api::article.article'],
    });

    normalizeTransferFilterOptions(opts);

    expect(opts.exclude).toEqual(['files']);
    expect(opts.filesAutoExcluded).toBe(true);
  });
});
