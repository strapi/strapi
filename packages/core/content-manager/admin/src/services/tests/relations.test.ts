import { errors } from '@strapi/utils';
import { act, renderHook, server } from '@tests/utils';
import { http, HttpResponse } from 'msw';

import { useLazyGetAllRelationsQuery } from '../relations';

describe('relations', () => {
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
