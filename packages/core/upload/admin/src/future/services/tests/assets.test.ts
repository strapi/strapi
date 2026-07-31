import { renderHook, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import * as qs from 'qs';

import { useGetAssetsQuery } from '../assets';

describe('future assets service - getAssets filter shape', () => {
  let lastRequestParams:
    | { _q?: string; filters?: { $and?: Array<{ folder?: { id: unknown } }> } }
    | undefined;

  beforeEach(() => {
    lastRequestParams = undefined;
    server.use(
      http.get('*/upload/files', ({ request }) => {
        lastRequestParams = qs.parse(new URL(request.url).search.slice(1));
        return HttpResponse.json({
          results: [],
          pagination: { page: 1, pageSize: 10, pageCount: 0, total: 0 },
        });
      })
    );
  });

  it('filters by folder.id when a folder is provided', async () => {
    const { result } = renderHook(() => useGetAssetsQuery({ folder: 7 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastRequestParams).toMatchObject({
      filters: { $and: [{ folder: { id: '7' } }] },
    });
  });

  it('filters by $null folder when no folder is provided', async () => {
    const { result } = renderHook(() => useGetAssetsQuery({}));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastRequestParams).toMatchObject({
      filters: { $and: [{ folder: { id: { $null: 'true' } } }] },
    });
  });

  it('filters by $null folder when folder is explicitly null', async () => {
    const { result } = renderHook(() => useGetAssetsQuery({ folder: null }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastRequestParams).toMatchObject({
      filters: { $and: [{ folder: { id: { $null: 'true' } } }] },
    });
  });

  it('does not send the legacy folderPath query parameter', async () => {
    const { result } = renderHook(() => useGetAssetsQuery({ folder: 7 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastRequestParams).not.toHaveProperty('folderPath');
  });

  it('sends _q and drops the folder filter when searching', async () => {
    const { result } = renderHook(() => useGetAssetsQuery({ folder: 7, search: 'kitten' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastRequestParams?._q).toBe('kitten');
    expect(lastRequestParams).not.toHaveProperty('filters');
  });

  it('does not leak the raw search param to the server', async () => {
    const { result } = renderHook(() => useGetAssetsQuery({ search: 'kitten' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastRequestParams).not.toHaveProperty('search');
  });

  it('encodes _q so an ampersand survives the request', async () => {
    const { result } = renderHook(() => useGetAssetsQuery({ search: 'a&b' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    // qs.parse in the handler decodes the wire value back to the original term.
    expect(lastRequestParams?._q).toBe('a&b');
  });

  it('keeps the folder filter and omits _q when the search term is empty', async () => {
    const { result } = renderHook(() => useGetAssetsQuery({ folder: 7, search: '' }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastRequestParams).not.toHaveProperty('_q');
    expect(lastRequestParams).toMatchObject({
      filters: { $and: [{ folder: { id: '7' } }] },
    });
  });

  describe('search combined with list filters', () => {
    const MIME_FILTER = { mime: { $contains: 'image' } };

    it('sends _q AND the list filters together — search composes with filters', async () => {
      const { result } = renderHook(() =>
        useGetAssetsQuery({ folder: 7, search: 'kitten', filters: [MIME_FILTER] })
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(lastRequestParams?._q).toBe('kitten');
      expect(lastRequestParams).toMatchObject({
        filters: { $and: [{ mime: { $contains: 'image' } }] },
      });
    });

    it('drops only the folder scope while searching — list filters survive', async () => {
      const { result } = renderHook(() =>
        useGetAssetsQuery({ folder: 7, search: 'kitten', filters: [MIME_FILTER] })
      );

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      const clauses = (lastRequestParams?.filters?.$and ?? []) as Record<string, unknown>[];
      expect(clauses.some((clause) => 'folder' in clause)).toBe(false);
      expect(clauses.some((clause) => 'mime' in clause)).toBe(true);
    });

    it('appends the list filters after the folder scope when not searching', async () => {
      const { result } = renderHook(() => useGetAssetsQuery({ folder: 7, filters: [MIME_FILTER] }));

      await waitFor(() => expect(result.current.isSuccess).toBe(true));

      expect(lastRequestParams).toMatchObject({
        filters: { $and: [{ folder: { id: '7' } }, { mime: { $contains: 'image' } }] },
      });
      expect(lastRequestParams).not.toHaveProperty('_q');
    });
  });
});
