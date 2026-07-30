import { isSpaceScopedContentType, getSpaceScopedContentTypes } from '../content-types';

describe('isSpaceScopedContentType', () => {
  it('returns true when pluginOptions.spaces.scope === "space"', () => {
    const ct = { pluginOptions: { spaces: { scope: 'space' } } };
    expect(isSpaceScopedContentType(ct)).toBe(true);
  });

  it('returns false when scope === "platform"', () => {
    const ct = { pluginOptions: { spaces: { scope: 'platform' } } };
    expect(isSpaceScopedContentType(ct)).toBe(false);
  });

  it('returns false when spaces pluginOptions is missing entirely', () => {
    const ct = { pluginOptions: { i18n: { localized: true } } };
    expect(isSpaceScopedContentType(ct)).toBe(false);
  });

  it('returns false when pluginOptions is missing entirely', () => {
    const ct = { info: { singularName: 'article' } };
    expect(isSpaceScopedContentType(ct)).toBe(false);
  });

  it('returns false for null/undefined input', () => {
    expect(isSpaceScopedContentType(null)).toBe(false);
    expect(isSpaceScopedContentType(undefined)).toBe(false);
  });

  it('treats unexpected scope values as not space-scoped', () => {
    const ct = { pluginOptions: { spaces: { scope: 'foo' as never } } };
    expect(isSpaceScopedContentType(ct)).toBe(false);
  });
});

describe('getSpaceScopedContentTypes', () => {
  it('returns only the space-scoped CTs from strapi.contentTypes', () => {
    const fakeStrapi = {
      contentTypes: {
        'api::article.article': {
          uid: 'api::article.article',
          pluginOptions: { spaces: { scope: 'space' } },
        },
        'api::tag.tag': {
          uid: 'api::tag.tag',
          pluginOptions: { spaces: { scope: 'platform' } },
        },
        'admin::user': {
          uid: 'admin::user',
          pluginOptions: {},
        },
      },
    } as any;

    const result = getSpaceScopedContentTypes(fakeStrapi);
    expect(result).toHaveLength(1);
    expect((result[0] as any).uid).toBe('api::article.article');
  });

  it('returns an empty array when no CT opts in', () => {
    const fakeStrapi = {
      contentTypes: {
        'admin::user': { uid: 'admin::user', pluginOptions: {} },
      },
    } as any;

    expect(getSpaceScopedContentTypes(fakeStrapi)).toEqual([]);
  });
});
