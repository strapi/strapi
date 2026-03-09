import documentManager from '../document-manager';
import { buildDeepPopulate } from '../utils/populate';

jest.mock('../utils/populate', () => ({
  buildDeepPopulate: jest.fn(),
  getDeepPopulate: jest.fn(),
  getDeepPopulateDraftCount: jest.fn(),
}));

describe('document-manager', () => {
  test('deleteMany deletes each unique document once and counts only deleted documents', async () => {
    const buildDeepPopulateMock = buildDeepPopulate as jest.MockedFunction<
      typeof buildDeepPopulate
    >;
    const deleteMock = jest
      .fn()
      .mockResolvedValueOnce({ documentId: 'doc-1', entries: [{ id: 1 }] })
      .mockResolvedValueOnce({ documentId: 'doc-2', entries: [] });
    const documentsMock = jest.fn(() => ({ delete: deleteMock }));
    const transactionMock = jest.fn((handler) => handler());

    buildDeepPopulateMock.mockResolvedValue({ populate: 'deep' } as any);

    const service = documentManager({
      strapi: {
        documents: documentsMock,
        db: {
          transaction: transactionMock,
        },
      } as any,
    });

    const result = await service.deleteMany(['doc-1', 'doc-1', 'doc-2'], 'api::article.article', {
      locale: 'en',
    });

    expect(buildDeepPopulateMock).toHaveBeenCalledWith('api::article.article');
    expect(transactionMock).toHaveBeenCalledTimes(1);
    expect(documentsMock).toHaveBeenCalledTimes(2);
    expect(deleteMock).toHaveBeenNthCalledWith(1, {
      documentId: 'doc-1',
      locale: 'en',
      populate: { populate: 'deep' },
    });
    expect(deleteMock).toHaveBeenNthCalledWith(2, {
      documentId: 'doc-2',
      locale: 'en',
      populate: { populate: 'deep' },
    });
    expect(result).toStrictEqual({ count: 1 });
  });
});
