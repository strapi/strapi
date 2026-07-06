import { createEntityFilter, createLinkFilter } from '../data-transfer';

jest.mock('@strapi/core', () => ({
  createStrapi: jest.fn(),
  compileStrapi: jest.fn(),
}));

describe('content type transfer filters', () => {
  const entityFilter = createEntityFilter({
    excludeContentTypes: ['plugin::upload.file', 'plugin::upload.folder'],
  });
  const linkFilter = createLinkFilter({
    excludeContentTypes: ['plugin::upload.file', 'plugin::upload.folder'],
  });

  test('entity filter excludes listed content types', () => {
    expect(entityFilter({ type: 'plugin::upload.file' })).toBe(false);
    expect(entityFilter({ type: 'plugin::upload.folder' })).toBe(false);
    expect(entityFilter({ type: 'api::article.article' })).toBe(true);
  });

  test('entity filter excludes admin content types by default', () => {
    expect(entityFilter({ type: 'admin::user' })).toBe(false);
  });

  test('link filter excludes links touching excluded content types', () => {
    expect(
      linkFilter({
        left: { type: 'plugin::upload.file' },
        right: { type: 'api::article.article' },
      })
    ).toBe(false);
    expect(
      linkFilter({
        left: { type: 'api::article.article' },
        right: { type: 'api::category.category' },
      })
    ).toBe(true);
  });

  test('only-content-types limits entities and links to listed types', () => {
    const onlyEntityFilter = createEntityFilter({
      onlyContentTypes: ['api::article.article'],
    });
    const onlyLinkFilter = createLinkFilter({
      onlyContentTypes: ['api::article.article'],
    });

    expect(onlyEntityFilter({ type: 'api::article.article' })).toBe(true);
    expect(onlyEntityFilter({ type: 'api::category.category' })).toBe(false);
    expect(
      onlyLinkFilter({
        left: { type: 'api::article.article' },
        right: { type: 'api::category.category' },
      })
    ).toBe(false);
  });
});
