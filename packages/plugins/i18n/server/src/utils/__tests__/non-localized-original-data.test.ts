import { getOriginalNonLocalizedLookup } from '../non-localized-original-data';

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
