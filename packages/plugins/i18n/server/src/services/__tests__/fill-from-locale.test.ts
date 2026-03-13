import fillFromLocaleService from '../fill-from-locale';

const createMockStrapi = (overrides: Record<string, unknown> = {}) => {
  const documentsFindOne = jest.fn();
  const documentsFindFirst = jest.fn();

  const contentManagerPlugin = {
    services: {
      'populate-builder': () => ({
        populateDeep: () => ({
          build: () => Promise.resolve({}),
        }),
      }),
      'document-metadata': {
        getStatus: (entry: { publishedAt: unknown }) => (entry.publishedAt ? 'published' : 'draft'),
      },
    },
  };

  const i18nPlugin = {
    services: {
      'content-types': {
        isLocalizedContentType: () => true,
      },
    },
  };

  const mockStrapi = {
    getModel: jest.fn(),
    documents: jest.fn(() => ({
      findOne: documentsFindOne,
      findFirst: documentsFindFirst,
    })),
    plugins: {
      'content-manager': contentManagerPlugin,
      i18n: i18nPlugin,
    },
    ...overrides,
  };

  return { mockStrapi, documentsFindOne, documentsFindFirst };
};

describe('fill-from-locale service', () => {
  let service: ReturnType<typeof fillFromLocaleService>;
  let documentsFindOne: jest.Mock;
  let getModel: jest.Mock;

  beforeEach(() => {
    const { mockStrapi, documentsFindOne: fn1 } = createMockStrapi();
    documentsFindOne = fn1;
    getModel = mockStrapi.getModel as jest.Mock;

    global.strapi = mockStrapi as any;
    service = fillFromLocaleService();
  });

  describe('getDataForLocale', () => {
    const model = 'api::article.article';
    const documentId = 'doc-id-123';
    const sourceLocale = 'en';
    const targetLocale = 'fr';

    beforeEach(() => {
      getModel.mockReturnValue({
        uid: model,
        attributes: {
          title: { type: 'string' },
          content: { type: 'richtext' },
        },
      });
    });

    test('returns null when document not found', async () => {
      documentsFindOne.mockResolvedValue(null);

      const result = await service.getDataForLocale(
        model as any,
        sourceLocale,
        targetLocale,
        documentId
      );

      expect(result).toBeNull();
      expect(documentsFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId,
          locale: sourceLocale,
        })
      );
    });

    test('returns processed data when document exists', async () => {
      const document = {
        title: 'Hello',
        content: 'World',
        documentId,
        locale: sourceLocale,
      };
      documentsFindOne.mockResolvedValue(document);

      const result = await service.getDataForLocale(
        model as any,
        sourceLocale,
        targetLocale,
        documentId
      );

      expect(result).not.toBeNull();
      expect(result).toMatchObject({
        title: 'Hello',
        content: 'World',
      });
      expect(result).not.toHaveProperty('documentId');
      expect(result).not.toHaveProperty('locale');
    });

    test('returns document when model has draft and publish', async () => {
      getModel.mockReturnValue({
        uid: model,
        options: { draftAndPublish: true },
        attributes: {
          title: { type: 'string' },
          publishedAt: { type: 'datetime' },
        },
      });

      const publishedDoc = {
        title: 'Published Title',
        documentId,
        locale: sourceLocale,
        publishedAt: '2024-01-01T00:00:00.000Z',
      };
      documentsFindOne.mockResolvedValue(publishedDoc);

      const result = await service.getDataForLocale(
        model as any,
        sourceLocale,
        targetLocale,
        documentId
      );

      expect(result).toMatchObject({ title: 'Published Title' });
      expect(documentsFindOne).toHaveBeenCalledWith(
        expect.objectContaining({
          documentId,
          locale: sourceLocale,
        })
      );
    });

    test('returns null when model not found', async () => {
      getModel.mockReturnValue(null);

      await expect(
        service.getDataForLocale(model as any, sourceLocale, targetLocale, documentId)
      ).rejects.toThrow(`Model ${model} not found`);
    });
  });
});
