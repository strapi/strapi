import documentMetadataLoader from '../document-metadata';

describe('document-metadata.getStatus locale awareness', () => {
  const createService = () => {
    // getStatus does not rely on strapi in its current implementation
    // Provide a minimal shape to satisfy the factory signature.
    const service = (documentMetadataLoader as any)({ strapi: {} });
    return service as {
      getStatus: (
        version: {
          id?: string | number;
          documentId: string;
          locale?: string | null;
          updatedAt?: string | Date | null;
          publishedAt?: string | Date | null;
        },
        other?: Array<{
          id?: string | number;
          documentId: string;
          locale?: string | null;
          updatedAt?: string | Date | null;
          publishedAt?: string | Date | null;
        }>
      ) => 'draft' | 'published' | 'modified';
    };
  };

  test('does not mark a locale as modified based on other locales (published EN, modified draft EN-GB)', () => {
    const { getStatus } = createService();

    const enPublished = {
      documentId: 'doc-1',
      locale: 'en',
      updatedAt: '2024-01-01T00:00:00.000Z',
      publishedAt: '2024-01-01T00:00:00.000Z',
    };

    const enGbDraftNewer = {
      documentId: 'doc-1',
      locale: 'en-GB',
      updatedAt: '2024-02-01T00:00:00.000Z',
      publishedAt: null,
    };

    const status = getStatus(enPublished, [enGbDraftNewer]);

    expect(status).toBe('published');
  });

  test('returns modified when the same-locale draft is newer than its published version', () => {
    const { getStatus } = createService();

    const enPublished = {
      documentId: 'doc-1',
      locale: 'en',
      updatedAt: '2024-01-01T00:00:00.000Z',
      publishedAt: '2024-01-01T00:00:00.000Z',
    };

    const enDraftNewer = {
      documentId: 'doc-1',
      locale: 'en',
      updatedAt: '2024-03-01T00:00:00.000Z',
      publishedAt: null,
    };

    const status = getStatus(enPublished, [enDraftNewer]);

    expect(status).toBe('modified');
  });

  test('returns draft when only other-locale published exists', () => {
    const { getStatus } = createService();

    const enDraft = {
      documentId: 'doc-1',
      locale: 'en',
      updatedAt: '2024-01-01T00:00:00.000Z',
      publishedAt: null,
    };

    const enGbPublished = {
      documentId: 'doc-1',
      locale: 'en-GB',
      updatedAt: '2024-02-01T00:00:00.000Z',
      publishedAt: '2024-02-01T00:00:00.000Z',
    };

    const status = getStatus(enDraft, [enGbPublished]);

    expect(status).toBe('draft');
  });

  test('when no locale on version, falls back to first counterpart', () => {
    const { getStatus } = createService();

    const noLocaleDraft = {
      documentId: 'doc-1',
      updatedAt: '2024-03-01T00:00:00.000Z',
      publishedAt: null,
    };

    const publishedCounterpart = {
      documentId: 'doc-1',
      locale: 'en',
      updatedAt: '2024-02-01T00:00:00.000Z',
      publishedAt: '2024-02-01T00:00:00.000Z',
    };

    const status = getStatus(noLocaleDraft as any, [publishedCounterpart]);

    expect(status).toBe('modified');
  });
});
