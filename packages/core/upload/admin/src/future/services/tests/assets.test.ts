import { renderHook, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';
import * as qs from 'qs';

import { useGetAssetsQuery } from '../assets';

describe('future assets service - getAssets filter shape', () => {
  let lastRequestParams: { filters?: { $and?: Array<{ folder?: { id: unknown } }> } } | undefined;

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
});
