import { act, renderHook, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import * as qs from 'qs';

import { useDeleteAssetMutation, useUpdateAssetMutation } from '../assets';
import { useGetFoldersQuery, useGetFolderQuery } from '../folders';

describe('future folders service - getFolders filter shape', () => {
  let lastRequestParams:
    | {
        _q?: string;
        sort?: string;
        populate?: Record<string, unknown>;
        filters?: { $and?: Array<{ parent?: { id: unknown } }> };
      }
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

  it('populates parent, which the server otherwise omits', async () => {
    // Every row would report `parentId: null` without it, so the move dialog
    // could neither offer the root nor prune the current parent.
    const { result } = renderHook(() => useGetFoldersQuery({ parentId: 7 }));

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(lastRequestParams?.populate).toEqual({ parent: 'true' });
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

describe('future folder header count invalidation', () => {
  it('refetches the folder so the header count updates when an asset is deleted from it', async () => {
    let folderRequests = 0;
    let fileCount = 3;

    server.use(
      http.get('*/upload/folders/:id', () => {
        folderRequests += 1;
        return HttpResponse.json({
          data: { id: 1, name: 'My folder', files: { count: fileCount }, children: { count: 0 } },
        });
      }),
      http.delete('*/upload/files/:id', () => {
        // The delete changed the folder's file count on the server.
        fileCount = 2;
        return HttpResponse.json({ data: {} });
      })
    );

    const { result } = renderHook(() => ({
      folder: useGetFolderQuery({ id: 1 }),
      deleteAsset: useDeleteAssetMutation(),
    }));

    await waitFor(() => expect(result.current.folder.data?.files?.count).toBe(3));
    expect(folderRequests).toBe(1);

    await act(async () => {
      await result.current.deleteAsset[0](99).unwrap();
    });

    // deleteAsset invalidates `{ Folder, LIST }`; getFolder now carries that tag,
    // so the header count refetches to the new value without a page reload.
    await waitFor(() => expect(result.current.folder.data?.files?.count).toBe(2));
    expect(folderRequests).toBeGreaterThan(1);
  });

  it('refetches the folder header count when an asset is moved out of it via updateAsset', async () => {
    // The Location select in the asset drawer submits a folder move through
    // updateAsset — the folder's count must refresh, same as upload/delete.
    let folderRequests = 0;
    let fileCount = 3;

    server.use(
      http.get('*/upload/folders/:id', () => {
        folderRequests += 1;
        return HttpResponse.json({
          data: { id: 1, name: 'My folder', files: { count: fileCount }, children: { count: 0 } },
        });
      }),
      http.post('*/upload', () => {
        // The move dropped this folder's count on the server.
        fileCount = 2;
        return HttpResponse.json({ data: { id: 99 } });
      })
    );

    const { result } = renderHook(() => ({
      folder: useGetFolderQuery({ id: 1 }),
      updateAsset: useUpdateAssetMutation(),
    }));

    await waitFor(() => expect(result.current.folder.data?.files?.count).toBe(3));
    expect(folderRequests).toBe(1);

    await act(async () => {
      await result.current.updateAsset[0]({ id: 99, fileInfo: { folder: 2 } }).unwrap();
    });

    // updateAsset now invalidates `{ Folder, LIST }`, so the header count
    // refetches after a move without a page reload.
    await waitFor(() => expect(result.current.folder.data?.files?.count).toBe(2));
    expect(folderRequests).toBeGreaterThan(1);
  });
});
