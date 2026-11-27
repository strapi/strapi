import {
  getOriginalNonLocalizedLookup,
  getSiblingNonLocalizedLookups,
} from '../non-localized-original-data';

describe('getOriginalNonLocalizedLookup', () => {
  it('returns null when there is no documentId', () => {
    expect(
      getOriginalNonLocalizedLookup({
        locale: 'fr',
        action: 'update',
        hasDraftAndPublish: true,
        defaultLocale: 'en',
      })
    ).toBeNull();
  });

  it('scopes update to the requested locale draft', () => {
    expect(
      getOriginalNonLocalizedLookup({
        documentId: 'doc-1',
        locale: 'fr',
        action: 'update',
        hasDraftAndPublish: true,
        defaultLocale: 'en',
      })
    ).toEqual({
      documentId: 'doc-1',
      locale: 'fr',
      publishedAt: { $null: true },
    });
  });

  it('scopes publish to the requested locale published row', () => {
    expect(
      getOriginalNonLocalizedLookup({
        documentId: 'doc-1',
        locale: 'fr',
        action: 'publish',
        hasDraftAndPublish: true,
        defaultLocale: 'en',
      })
    ).toEqual({
      documentId: 'doc-1',
      locale: 'fr',
      publishedAt: { $ne: null },
    });
  });

  it('falls back to the default locale when locale is missing or *', () => {
    expect(
      getOriginalNonLocalizedLookup({
        documentId: 'doc-1',
        action: 'create',
        hasDraftAndPublish: true,
        defaultLocale: 'en',
      })
    ).toEqual({
      documentId: 'doc-1',
      locale: 'en',
      publishedAt: { $null: true },
    });

    expect(
      getOriginalNonLocalizedLookup({
        documentId: 'doc-1',
        locale: '*',
        action: 'update',
        hasDraftAndPublish: true,
        defaultLocale: 'en',
      })
    ).toEqual({
      documentId: 'doc-1',
      locale: 'en',
      publishedAt: { $null: true },
    });
  });

  it('omits the locale when neither the request nor the store resolves one', () => {
    expect(
      getOriginalNonLocalizedLookup({
        documentId: 'doc-1',
        action: 'update',
        hasDraftAndPublish: true,
        defaultLocale: undefined,
      })
    ).toEqual({
      documentId: 'doc-1',
      publishedAt: { $null: true },
    });
  });

  it('omits publication status when Draft & Publish is disabled', () => {
    expect(
      getOriginalNonLocalizedLookup({
        documentId: 'doc-1',
        locale: 'fr',
        action: 'publish',
        hasDraftAndPublish: false,
        defaultLocale: 'en',
      })
    ).toEqual({
      documentId: 'doc-1',
      locale: 'fr',
    });
  });
});

describe('getSiblingNonLocalizedLookups', () => {
  const draft = { documentId: 'doc-1', locale: 'fr', publishedAt: { $null: true as const } };

  it('tries the default locale before any other locale in the same status', () => {
    expect(
      getSiblingNonLocalizedLookups({ original: draft, locale: 'fr', defaultLocale: 'en' })
    ).toEqual([
      { documentId: 'doc-1', locale: 'en', publishedAt: { $null: true } },
      { documentId: 'doc-1', locale: { $ne: 'fr' }, publishedAt: { $null: true } },
    ]);
  });

  it('uses the resolved default locale when the request has no locale', () => {
    const original = { ...draft, locale: 'en' };

    expect(getSiblingNonLocalizedLookups({ original, defaultLocale: 'en' })).toEqual([
      { documentId: 'doc-1', locale: { $ne: 'en' }, publishedAt: { $null: true } },
    ]);
    expect(getSiblingNonLocalizedLookups({ original, locale: '', defaultLocale: 'en' })).toEqual([
      { documentId: 'doc-1', locale: { $ne: 'en' }, publishedAt: { $null: true } },
    ]);
  });

  it('skips the default locale lookup when no default locale is stored', () => {
    expect(getSiblingNonLocalizedLookups({ original: draft, locale: 'fr' })).toEqual([
      { documentId: 'doc-1', locale: { $ne: 'fr' }, publishedAt: { $null: true } },
    ]);
  });

  it('returns no lookup for a wildcard or multi-locale request', () => {
    const original = { ...draft, locale: 'en' };

    expect(getSiblingNonLocalizedLookups({ original, locale: '*', defaultLocale: 'en' })).toEqual(
      []
    );
    expect(
      getSiblingNonLocalizedLookups({ original, locale: ['en', 'fr'], defaultLocale: 'en' })
    ).toEqual([]);
  });

  it('returns no lookup without an original lookup or a resolved locale', () => {
    expect(getSiblingNonLocalizedLookups({ original: null, locale: 'fr' })).toEqual([]);
    expect(
      getSiblingNonLocalizedLookups({
        original: { documentId: 'doc-1', publishedAt: { $null: true } },
      })
    ).toEqual([]);
  });
});
