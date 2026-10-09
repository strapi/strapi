import { errors } from '@strapi/utils';
import { act, renderHook, server, waitFor } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useLazyGetAllRelationsQuery, useLazySearchRelationsQuery } from '../relations';

describe('relations', () => {
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
        expect(result.current.first[1].data?.results?.[0]?.documentId).toBe(
          'document-for-source-1'
        );
      });
      expect(result.current.second[1].data?.results?.[0]?.documentId).toBe('document-for-source-2');
    });
  });

  describe('getAllRelations', () => {
    it('should load every page and return the relations in the order they are displayed', async () => {
      // The API returns the latest relations first.
      const allRelations = Array.from({ length: 250 }, (_, index) => ({
        id: 250 - index,
        documentId: `document-${250 - index}`,
      }));
      const requestedPages: string[] = [];

      server.use(
        http.get('/content-manager/relations/:model/:id/:fieldName', ({ request }) => {
          const { searchParams } = new URL(request.url);
          const page = Number(searchParams.get('page'));
          const pageSize = Number(searchParams.get('pageSize'));

          requestedPages.push(`${page}/${pageSize}`);

          return HttpResponse.json({
            results: allRelations.slice((page - 1) * pageSize, page * pageSize),
            pagination: {
              page,
              pageSize,
              pageCount: Math.ceil(allRelations.length / pageSize),
              total: allRelations.length,
            },
          });
        })
      );

      const { result } = renderHook(() => useLazyGetAllRelationsQuery());
      const [getAllRelations] = result.current;

      const relations = await act(() =>
        getAllRelations({ model: 'shared.link', id: 1, targetField: 'pages' }).unwrap()
      );

      expect(requestedPages).toEqual(['1/100', '2/100', '3/100']);
      expect(relations.map((relation) => relation.id)).toEqual(
        Array.from({ length: 250 }, (_, index) => index + 1)
      );
    });

    it('should fail when the relations cannot be loaded', async () => {
      server.use(
        http.get('/content-manager/relations/:model/:id/:fieldName', () =>
          HttpResponse.json({ error: new errors.ForbiddenError('Forbidden') }, { status: 403 })
        )
      );

      const { result } = renderHook(() => useLazyGetAllRelationsQuery());
      const [getAllRelations] = result.current;

      await expect(
        act(() => getAllRelations({ model: 'shared.link', id: 1, targetField: 'pages' }).unwrap())
      ).rejects.toMatchObject({ name: 'ForbiddenError' });
    });
  });
});
