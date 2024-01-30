import documentMetadataLoader, { type DocumentVersionSelector } from '../document-metadata';

import '@strapi/types';

let documentMetadata: ReturnType<typeof documentMetadataLoader>;

const dbFindManyMock = jest
  .fn()
  .mockResolvedValue([{ id: 1, locale: 'en', publishedAt: new Date() }]);

const documentsFindOneMock = jest
  .fn()
  .mockResolvedValue({ id: 1, locale: 'en', publishedAt: new Date() });

describe('Document Metadata', () => {
  beforeEach(() => {
    global.strapi = {
      documents: jest.fn().mockReturnValue({
        findOne: documentsFindOneMock,
      }),
      db: {
        query: jest.fn(() => ({
          findMany: dbFindManyMock,
        })),
      },
    } as any;
    documentMetadata = documentMetadataLoader({ strapi });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Get Metadata', () => {
    test('Gets available draft locales', async () => {
      const uid = 'api::test.test';
      const document: DocumentVersionSelector = { id: '1', locale: 'en', publishedAt: null };
      await documentMetadata.getMetadata(uid, document);

      // Should have looked for available locales
      expect(dbFindManyMock).toBeCalledWith({
        where: {
          documentId: document.id,
          // All locales but the current one
          locale: { $ne: document.locale },
          // Find locales that are not published
          publishedAt: null,
        },
        select: ['id', 'locale', 'updatedAt', 'createdAt', 'publishedAt'],
      });
    });

    test('Gets available published locales', async () => {
      const uid = 'api::test.test';
      const document: DocumentVersionSelector = { id: '1', locale: 'en', publishedAt: new Date() };
      await documentMetadata.getMetadata(uid, document);

      // Should have looked for available locales
      expect(dbFindManyMock).toBeCalledWith({
        where: {
          documentId: document.id,
          // All locales but the current one
          locale: { $ne: document.locale },
          // Find locales that are published
          publishedAt: { $ne: null },
        },
        select: ['id', 'locale', 'updatedAt', 'createdAt', 'publishedAt'],
      });
    });
  });

  describe('Get Status', () => {
    test('Gets published status', async () => {
      const uid = 'api::test.test';
      const document: DocumentVersionSelector = { id: '1', locale: 'en', publishedAt: new Date() };

      // Mock findOne to return the other status
      const expectedAvailableStatus = [{ id: 1, locale: 'en', publishedAt: null }];
      documentsFindOneMock.mockResolvedValueOnce(expectedAvailableStatus[0]);

      const metadata = await documentMetadata.getMetadata(uid, document);

      // Should have looked for available status
      expect(documentsFindOneMock).toBeCalledWith(document.id, {
        locale: document.locale,
        status: 'draft',
        fields: ['id', 'updatedAt', 'createdAt', 'publishedAt'],
      });

      expect(metadata.availableStatus).toEqual(expectedAvailableStatus);
    });

    test('Gets draft status', async () => {
      const uid = 'api::test.test';
      const document: DocumentVersionSelector = { id: '1', locale: 'en', publishedAt: null };
      await documentMetadata.getMetadata(uid, document);

      // Should have looked for available status
      expect(documentsFindOneMock).toBeCalledWith(document.id, {
        locale: document.locale,
        status: 'published',
        fields: ['id', 'updatedAt', 'createdAt', 'publishedAt'],
      });
    });
  });
});
