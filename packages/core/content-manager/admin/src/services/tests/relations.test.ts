import { server, renderHook, act, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useLazySearchRelationsQuery } from '../relations';

describe('searchRelations', () => {
  it('caches results per source id so relation fields in different components do not share results', async () => {
    server.use(
      http.get('/content-manager/relations/:model/:fieldName', ({ request }) => {
        const id = new URL(request.url).searchParams.get('id');

        return HttpResponse.json({
          results: [
            {
              id: id === '1' ? 101 : 202,
              documentId: `document-for-source-${id}`,
              locale: 'en',
              status: 'draft',
              name: `Entity for source ${id}`,
            },
          ],
          pagination: { page: 1, pageCount: 1, pageSize: 10, total: 1 },
        });
      })
    );

    const { result } = renderHook(() => ({
      first: useLazySearchRelationsQuery(),
      second: useLazySearchRelationsQuery(),
    }));

    const [firstTrigger] = result.current.first;
    const [secondTrigger] = result.current.second;

    await act(async () => {
      await firstTrigger({
        model: 'basic.relation',
        targetField: 'categories',
        params: { id: '1', pageSize: 10, page: 1 },
      });
      await secondTrigger({
        model: 'basic.relation',
        targetField: 'categories',
        params: { id: '2', pageSize: 10, page: 1 },
      });
    });

    await waitFor(() => {
      expect(result.current.first[1].data?.results?.[0]?.documentId).toBe('document-for-source-1');
    });
    expect(result.current.second[1].data?.results?.[0]?.documentId).toBe('document-for-source-2');
  });
});
