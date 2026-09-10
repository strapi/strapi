import {
  isSpaceScopedContentType,
  isSharedContentType,
  isSharedEditableContentType,
  getSpaceScopedContentTypes,
} from '../content-types';

describe('isSpaceScopedContentType', () => {
  it('is on by default for user content types', () => {
    expect(isSpaceScopedContentType({ uid: 'api::article.article' })).toBe(true);
    expect(
      isSpaceScopedContentType({ uid: 'api::article.article', pluginOptions: { i18n: {} } })
    ).toBe(true);
  });

  it('lets a user content type opt out', () => {
    const uid = 'api::article.article';
    expect(isSpaceScopedContentType({ uid, pluginOptions: { spaces: { enabled: false } } })).toBe(
      false
    );
    expect(isSpaceScopedContentType({ uid, pluginOptions: { spaces: { scope: 'none' } } })).toBe(
      false
    );
    expect(
      isSpaceScopedContentType({ uid, pluginOptions: { spaces: { scope: 'platform' } } })
    ).toBe(false);
  });

  it('is off by default for plugin and admin content types', () => {
    expect(isSpaceScopedContentType({ uid: 'plugin::upload.file' })).toBe(false);
    expect(isSpaceScopedContentType({ uid: 'admin::user', pluginOptions: {} })).toBe(false);
  });

  it('lets a plugin content type opt in with scope: "space"', () => {
    expect(
      isSpaceScopedContentType({
        uid: 'plugin::upload.file',
        pluginOptions: { spaces: { scope: 'space' } },
      })
    ).toBe(true);
  });

  it('never scopes when enabled is false, even with scope: "space"', () => {
    expect(
      isSpaceScopedContentType({
        uid: 'api::article.article',
        pluginOptions: { spaces: { scope: 'space', enabled: false } },
      })
    ).toBe(false);
  });

  it('returns false for null/undefined/uid-less input', () => {
    expect(isSpaceScopedContentType(null)).toBe(false);
    expect(isSpaceScopedContentType(undefined)).toBe(false);
    expect(isSpaceScopedContentType({ pluginOptions: { i18n: { localized: true } } })).toBe(false);
  });
});

describe('shared content types', () => {
  it('reads sharedEntries / sharedEditable only on scoped content types', () => {
    const shared = {
      uid: 'api::glossary.glossary',
      pluginOptions: { spaces: { sharedEntries: true } },
    };
    const editable = {
      uid: 'api::tag.tag',
      pluginOptions: { spaces: { sharedEntries: true, sharedEditable: true } },
    };
    const optedOut = {
      uid: 'api::tag.tag',
      pluginOptions: { spaces: { enabled: false, sharedEntries: true } },
    };

    expect(isSharedContentType(shared)).toBe(true);
    expect(isSharedEditableContentType(shared)).toBe(false);
    expect(isSharedEditableContentType(editable)).toBe(true);
    expect(isSharedContentType(optedOut)).toBe(false);
    expect(isSharedContentType({ uid: 'api::article.article' })).toBe(false);
  });

  it('ignores sharedEditable without sharedEntries', () => {
    expect(
      isSharedEditableContentType({
        uid: 'api::tag.tag',
        pluginOptions: { spaces: { sharedEditable: true } },
      })
    ).toBe(false);
  });
});

describe('getSpaceScopedContentTypes', () => {
  it('returns the scoped CTs from strapi.contentTypes', () => {
    const fakeStrapi = {
      contentTypes: {
        'api::article.article': { uid: 'api::article.article', pluginOptions: {} },
        'api::tag.tag': { uid: 'api::tag.tag', pluginOptions: { spaces: { scope: 'none' } } },
        'plugin::upload.file': {
          uid: 'plugin::upload.file',
          pluginOptions: { spaces: { scope: 'space' } },
        },
        'admin::user': { uid: 'admin::user', pluginOptions: {} },
      },
    } as any;

    const result = getSpaceScopedContentTypes(fakeStrapi).map((ct: any) => ct.uid);
    expect(result).toEqual(['api::article.article', 'plugin::upload.file']);
  });

  it('returns an empty array when nothing is scoped', () => {
    const fakeStrapi = {
      contentTypes: { 'admin::user': { uid: 'admin::user', pluginOptions: {} } },
    } as any;

    expect(getSpaceScopedContentTypes(fakeStrapi)).toEqual([]);
  });
});
