import { renderHook, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import * as qs from 'qs';

import { useGetFoldersQuery } from '../folders';

describe('future folders service - getFolders filter shape', () => {
  let lastRequestParams:
    | { _q?: string; sort?: string; filters?: { $and?: Array<{ parent?: { id: unknown } }> } }
    | undefined;

  beforeEach(() => {
    lastRequestParams = undefined;
    server.use(
      http.get('*/upload/folders', ({ request }) => {
        lastRequestParams = qs.parse(new URL(request.url).search.slice(1));
        return HttpResponse.json({ data: [] });
      })
    );
  });

  it('filters by parent.id when a parent is provided', async () => {
    const { result } = renderHook(() => useGetFoldersQuery({ parentId: 7 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastRequestParams).toMatchObject({
      filters: { $and: [{ parent: { id: '7' } }] },
    });
  });

  it('filters by $null parent when no parent is provided', async () => {
    const { result } = renderHook(() => useGetFoldersQuery({}));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastRequestParams).toMatchObject({
      filters: { $and: [{ parent: { id: { $null: 'true' } } }] },
    });
  });

  it('sends _q and drops the parent filter when searching', async () => {
    const { result } = renderHook(() => useGetFoldersQuery({ parentId: 7, search: 'photos' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastRequestParams?._q).toBe('photos');
    expect(lastRequestParams).not.toHaveProperty('filters');
  });

  it('encodes _q so an ampersand survives the request', async () => {
    const { result } = renderHook(() => useGetFoldersQuery({ search: 'a&b' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastRequestParams?._q).toBe('a&b');
  });

  it('does not send an unbounded pageSize when searching', async () => {
    const { result } = renderHook(() => useGetFoldersQuery({ search: 'photos' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastRequestParams).not.toHaveProperty('pageSize');
  });

  it('keeps the name sort while searching', async () => {
    const { result } = renderHook(() => useGetFoldersQuery({ search: 'photos' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastRequestParams?.sort).toBe('name:ASC');
  });

  it('keeps the parent filter and omits _q when the search term is empty', async () => {
    const { result } = renderHook(() => useGetFoldersQuery({ parentId: 7, search: '' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastRequestParams).not.toHaveProperty('_q');
    expect(lastRequestParams).toMatchObject({
      filters: { $and: [{ parent: { id: '7' } }] },
    });
  });

  describe('search combined with list filters', () => {
    const DATE_FILTER = { createdAt: { $gte: '2026-07-01T00:00:00.000Z' } };

    it('sends _q AND the date filters together, without the parent scope', async () => {
      const { result } = renderHook(() =>
        useGetFoldersQuery({ parentId: 7, search: 'photos', filters: [DATE_FILTER] })
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(lastRequestParams?._q).toBe('photos');
      const clauses = (lastRequestParams?.filters?.$and ?? []) as Record<string, unknown>[];
      expect(clauses.some((clause) => 'parent' in clause)).toBe(false);
      expect(clauses.some((clause) => 'createdAt' in clause)).toBe(true);
    });

    it('appends the date filters after the parent scope when not searching', async () => {
      const { result } = renderHook(() =>
        useGetFoldersQuery({ parentId: 7, filters: [DATE_FILTER] })
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(lastRequestParams).toMatchObject({
        filters: {
          $and: [{ parent: { id: '7' } }, { createdAt: { $gte: '2026-07-01T00:00:00.000Z' } }],
        },
      });
      expect(lastRequestParams).not.toHaveProperty('_q');
    });
  });
});
