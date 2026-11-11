import documentManager from '../document-manager';
import { sumDraftCounts } from '../utils/draft';
import { getDeepPopulateDraftCount } from '../utils/populate';

jest.mock('../utils/draft', () => ({
  sumDraftCounts: jest.fn(),
}));

jest.mock('../utils/populate', () => ({
  buildDeepPopulate: jest.fn(),
  getDeepPopulateDraftCount: jest.fn(),
}));

const RELATION_LAB_UID = 'api::relation-lab.relation-lab';

describe('document-manager', () => {
  const findMany = jest.fn();
  const sumDraftCountsMock = sumDraftCounts as jest.MockedFunction<typeof sumDraftCounts>;
  const getDeepPopulateDraftCountMock = getDeepPopulateDraftCount as jest.MockedFunction<
    typeof getDeepPopulateDraftCount
  >;

  beforeEach(() => {
    findMany.mockReset();
    sumDraftCountsMock.mockReset();
    getDeepPopulateDraftCountMock.mockReturnValue({
      populate: { manyToManyBi: true },
      hasRelations: true,
    });

    global.strapi = {
      documents: jest.fn(() => ({
        findMany,
      })),
    } as any;
  });

  describe('countManyEntriesDraftRelations', () => {
    it('uses the document service so non-localized types are found despite locale=en', async () => {
      const entities = [{ documentId: 'doc-1' }, { documentId: 'doc-2' }];
      findMany.mockResolvedValue(entities);
      sumDraftCountsMock
        .mockResolvedValueOnce({ unpublishedRelations: 0, draftM2mLinks: 1 })
        .mockResolvedValueOnce({ unpublishedRelations: 1, draftM2mLinks: 0 });

      const service = documentManager({ strapi: global.strapi });
      const total = await service.countManyEntriesDraftRelations(
        ['doc-1', 'doc-2'],
        RELATION_LAB_UID,
        'en'
      );

      expect(findMany).toHaveBeenCalledWith({
        populate: { manyToManyBi: true },
        filters: { documentId: { $in: ['doc-1', 'doc-2'] } },
        locale: 'en',
        status: 'draft',
      });
      expect(total).toBe(2);
    });

    it('returns 0 when the content type has no relations to count', async () => {
      getDeepPopulateDraftCountMock.mockReturnValue({ populate: {}, hasRelations: false });

      const service = documentManager({ strapi: global.strapi });
      const total = await service.countManyEntriesDraftRelations(['doc-1'], RELATION_LAB_UID, 'en');

      expect(total).toBe(0);
      expect(findMany).not.toHaveBeenCalled();
    });
  });

  describe('clone', () => {
    const clone = jest.fn();

    beforeEach(() => {
      clone.mockReset();
      clone.mockResolvedValue({ documentId: 'clone-1', entries: [{ documentId: 'clone-1' }] });

      global.strapi = {
        documents: jest.fn(() => ({ clone })),
      } as any;
    });

    it.each([
      ['a string', 'fr', 'fr'],
      ['null', null, undefined],
      ['absent', undefined, undefined],
    ])('passes the body locale when it is %s', async (_name, bodyLocale, expectedLocale) => {
      const service = documentManager({ strapi: global.strapi });
      const body =
        bodyLocale === undefined ? { title: 'Clone' } : { title: 'Clone', locale: bodyLocale };

      const result = await service.clone('doc-1', body as any, RELATION_LAB_UID);

      expect(result).toEqual({ documentId: 'clone-1' });
      expect(clone).toHaveBeenCalledTimes(1);
      expect(clone.mock.calls[0][0].documentId).toBe('doc-1');
      expect(clone.mock.calls[0][0].locale).toBe(expectedLocale);
    });
  });

  describe('publication actions without draft and publish', () => {
    const NON_DP_UID = 'api::non-dp.non-dp';

    beforeEach(() => {
      global.strapi = {
        documents: jest.fn(() => ({})),
        getModel: jest.fn(() => ({ uid: NON_DP_UID, options: { draftAndPublish: false } })),
      } as any;
    });

    it.each([
      ['publish', (service: any) => service.publish('doc-1', NON_DP_UID)],
      ['publishMany', (service: any) => service.publishMany(NON_DP_UID, ['doc-1'])],
      ['unpublish', (service: any) => service.unpublish('doc-1', NON_DP_UID)],
      ['unpublishMany', (service: any) => service.unpublishMany(['doc-1'], NON_DP_UID)],
      ['discardDraft', (service: any) => service.discardDraft('doc-1', NON_DP_UID)],
    ])('%s throws a validation error', async (_name, action) => {
      const service = documentManager({ strapi: global.strapi });

      await expect(action(service)).rejects.toMatchObject({
        name: 'ValidationError',
        message: 'Draft and publish is not enabled for this content type',
      });
      expect(global.strapi.documents).not.toHaveBeenCalled();
    });
  });
});
