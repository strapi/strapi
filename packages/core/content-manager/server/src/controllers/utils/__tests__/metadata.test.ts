import { formatDocumentWithMetadata } from '../metadata';

jest.mock('../../../utils', () => ({
  getService: jest.fn(),
}));

const { getService } = jest.requireMock('../../../utils') as {
  getService: jest.Mock;
};

describe('formatDocumentWithMetadata (controller util)', () => {
  it('preserves defaultLocale after sanitizing availableLocales/availableStatus', async () => {
    const sanitizeOutput = jest.fn(async (doc: unknown) => doc);
    const permissionChecker = { sanitizeOutput };

    getService.mockReturnValue({
      formatDocumentWithMetadata: jest.fn().mockResolvedValue({
        data: { documentId: 'doc-1', locale: 'fr' },
        meta: {
          availableLocales: [{ locale: 'en', documentId: 'doc-1' }],
          availableStatus: [],
          defaultLocale: 'en',
        },
      }),
    });

    const result = await formatDocumentWithMetadata(
      permissionChecker,
      'api::article.article',
      { id: 1, documentId: 'doc-1', locale: 'fr', publishedAt: null },
      { availableLocales: true, availableStatus: false }
    );

    expect(result.meta.defaultLocale).toBe('en');
    expect(result.meta.availableLocales).toEqual([{ locale: 'en', documentId: 'doc-1' }]);
    expect(sanitizeOutput).toHaveBeenCalled();
  });
});
