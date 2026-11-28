import { beforeEach, describe, expect, it, vi } from 'vitest';

import { createContentTypeRepository } from '../repository';

const updateEntry = vi.fn();

vi.mock('../entries', () => ({
  createEntriesService: () => ({ update: updateEntry }),
}));

vi.mock('../events', () => ({
  createEventManager: () => ({ emitEvent: vi.fn() }),
}));

vi.mock('../transform/id-transform', () => ({
  transformParamsDocumentId: vi.fn(async (_uid: string, params: unknown) => params),
}));

vi.mock('../transform/query', () => ({
  transformParamsToQuery: vi.fn((_uid: string, params: Record<string, unknown>) => {
    const { fields, populate } = params;
    return { ...(fields ? { select: fields } : {}), ...(populate ? { populate } : {}) };
  }),
}));

const uid = 'api::article.article';

describe('document service update', () => {
  const findOne = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();

    const contentType = {
      uid,
      modelType: 'contentType',
      kind: 'collectionType',
      options: { draftAndPublish: false },
      attributes: { title: { type: 'string' } },
    };

    global.strapi = {
      contentType: vi.fn(() => contentType),
      getModel: vi.fn(() => contentType),
      config: { get: vi.fn() },
      db: {
        query: vi.fn(() => ({ findOne })),
        transaction: vi.fn((run: () => unknown) => run()),
      },
      localization: { isLocalizedContentType: () => false },
    } as any;
  });

  it('looks up the entry to update by id only, without the caller populate', async () => {
    findOne.mockResolvedValueOnce({ id: 7 });
    updateEntry.mockResolvedValueOnce({ id: 7, documentId: 'doc-1', title: 'new' });

    const repository = createContentTypeRepository(uid as any, {} as any);

    await repository.update({
      documentId: 'doc-1',
      data: { title: 'new' },
      fields: ['title'],
      populate: '*',
    } as any);

    expect(findOne).toHaveBeenCalledTimes(1);
    expect(findOne).toHaveBeenCalledWith({
      select: ['id'],
      where: { documentId: 'doc-1' },
    });

    // The caller's selection is applied to the updated entry instead
    expect(updateEntry).toHaveBeenCalledWith(
      { id: 7 },
      expect.objectContaining({ fields: ['title'], populate: '*' })
    );
  });
});
