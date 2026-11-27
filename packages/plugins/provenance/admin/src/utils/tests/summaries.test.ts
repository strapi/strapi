import { getFetchClient } from '@strapi/admin/strapi-admin';

import { loadSummary } from '../summaries';

jest.mock('@strapi/admin/strapi-admin', () => ({
  getFetchClient: jest.fn(),
}));

describe('loadSummary', () => {
  const get = jest.fn();

  beforeEach(() => {
    get.mockReset();
    (getFetchClient as jest.Mock).mockReturnValue({ get });
  });

  it('groups the summaries asked in the same tick into one request', async () => {
    get.mockResolvedValue({ data: { data: { a: { ai: 2, toReview: 1 } } } });

    const [first, second] = await Promise.all([
      loadSummary({ uid: 'api::article.article', locale: 'en', documentId: 'a', version: '1' }),
      loadSummary({ uid: 'api::article.article', locale: 'en', documentId: 'b', version: '1' }),
    ]);

    expect(get).toHaveBeenCalledTimes(1);
    expect(get).toHaveBeenCalledWith('/provenance/summary/api::article.article', {
      params: { documentIds: 'a,b', locale: 'en' },
    });
    expect(first).toEqual({ ai: 2, toReview: 1 });
    // No AI row: no AI field
    expect(second).toEqual({ ai: 0, toReview: 0 });
  });

  it('asks again once the entry changed', async () => {
    get.mockResolvedValue({ data: { data: {} } });

    await loadSummary({ uid: 'api::tag.tag', locale: undefined, documentId: 'x', version: '1' });
    await loadSummary({ uid: 'api::tag.tag', locale: undefined, documentId: 'x', version: '1' });
    await loadSummary({ uid: 'api::tag.tag', locale: undefined, documentId: 'x', version: '2' });

    expect(get).toHaveBeenCalledTimes(2);
  });

  it('resolves to null when the request fails', async () => {
    get.mockRejectedValue(new Error('offline'));

    await expect(
      loadSummary({ uid: 'api::page.page', locale: 'en', documentId: 'p', version: '1' })
    ).resolves.toBeNull();
  });
});
