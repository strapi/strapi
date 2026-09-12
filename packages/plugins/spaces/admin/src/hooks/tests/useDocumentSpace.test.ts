import { server } from '@tests/server';
import { renderHook, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { clearDocumentSpaceCache, useDocumentSpace } from '../useDocumentSpace';

const FRANCE = { id: 1, name: 'France', slug: 'france' };
const GERMANY = { id: 2, name: 'Germany', slug: 'germany' };

/** Records what was asked for, so a test can count the requests. */
const trackOwnership = (owners: Record<string, unknown> = { 'doc-1': FRANCE }) => {
  const asked: Array<{ uid: string | null; documentIds: string[] }> = [];

  server.use(
    http.get('*/spaces/ownership', ({ request }) => {
      const url = new URL(request.url);
      asked.push({
        uid: url.searchParams.get('uid'),
        documentIds: (url.searchParams.get('documentIds') ?? '').split(',').filter(Boolean),
      });

      return HttpResponse.json({ data: owners });
    })
  );

  return asked;
};

describe('the space a document belongs to', () => {
  beforeEach(() => {
    clearDocumentSpaceCache();
  });

  it('is looked up and reported', async () => {
    trackOwnership();
    const { result } = renderHook(() => useDocumentSpace('api::article.article', 'doc-1'));

    await waitFor(() => expect(result.current).toEqual(FRANCE));
  });

  it('is null for a document every space can see', async () => {
    trackOwnership({ 'doc-1': null });
    const { result } = renderHook(() => useDocumentSpace('api::article.article', 'doc-1'));

    await waitFor(() => expect(result.current).toBeNull());
  });

  it('is null for a document the answer says nothing about', async () => {
    trackOwnership({});
    const { result } = renderHook(() => useDocumentSpace('api::article.article', 'doc-1'));

    await waitFor(() => expect(result.current).toBeNull());
  });

  it('is asked for once for a whole table, not once per row', async () => {
    // Fifty rows render in the same tick; fifty requests would be the reason
    // not to have this column at all.
    const asked = trackOwnership({ 'doc-1': FRANCE, 'doc-2': GERMANY, 'doc-3': null });

    const first = renderHook(() => useDocumentSpace('api::article.article', 'doc-1'));
    const second = renderHook(() => useDocumentSpace('api::article.article', 'doc-2'));
    const third = renderHook(() => useDocumentSpace('api::article.article', 'doc-3'));

    await waitFor(() => expect(first.result.current).toEqual(FRANCE));
    await waitFor(() => expect(second.result.current).toEqual(GERMANY));
    await waitFor(() => expect(third.result.current).toBeNull());

    expect(asked).toHaveLength(1);
    expect(asked[0].documentIds.sort()).toEqual(['doc-1', 'doc-2', 'doc-3']);
  });

  it('keeps one content type’s lookup separate from another’s', async () => {
    const asked = trackOwnership({ 'doc-1': FRANCE });

    const articles = renderHook(() => useDocumentSpace('api::article.article', 'doc-1'));
    const pages = renderHook(() => useDocumentSpace('api::page.page', 'doc-1'));

    await waitFor(() => expect(articles.result.current).toEqual(FRANCE));
    await waitFor(() => expect(pages.result.current).toEqual(FRANCE));

    expect(asked.map((entry) => entry.uid).sort()).toEqual([
      'api::article.article',
      'api::page.page',
    ]);
  });

  it('is remembered, so paging back does not ask again', async () => {
    const asked = trackOwnership();

    const first = renderHook(() => useDocumentSpace('api::article.article', 'doc-1'));
    await waitFor(() => expect(first.result.current).toEqual(FRANCE));

    const second = renderHook(() => useDocumentSpace('api::article.article', 'doc-1'));
    await waitFor(() => expect(second.result.current).toEqual(FRANCE));

    expect(asked).toHaveLength(1);
  });

  it('is forgotten on demand, so a space switch does not show the old owner', async () => {
    const asked = trackOwnership();

    const first = renderHook(() => useDocumentSpace('api::article.article', 'doc-1'));
    await waitFor(() => expect(first.result.current).toEqual(FRANCE));

    clearDocumentSpaceCache();

    const second = renderHook(() => useDocumentSpace('api::article.article', 'doc-1'));
    await waitFor(() => expect(second.result.current).toEqual(FRANCE));

    expect(asked).toHaveLength(2);
  });

  it('is nothing at all when there is no document to ask about', async () => {
    const asked = trackOwnership();
    const { result } = renderHook(() => useDocumentSpace('api::article.article', ''));

    expect(result.current).toBeUndefined();
    expect(asked).toHaveLength(0);
  });

  it('stays unknown when the lookup fails, rather than claiming an owner', async () => {
    // A failure here costs a column, not the page — and a wrong owner would be
    // worse than none.
    server.use(
      http.get('*/spaces/ownership', () => HttpResponse.json({ error: {} }, { status: 500 }))
    );

    const { result } = renderHook(() => useDocumentSpace('api::article.article', 'doc-1'));

    await waitFor(() => expect(result.current).toBeNull());
  });
});
