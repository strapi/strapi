/* eslint-disable check-file/filename-naming-convention */
import { act, renderHook, server, waitFor } from '@tests/utils';
import { rest } from 'msw';

import { UseRelationArgs, useRelation } from '../useRelation';

function setup(args?: Partial<UseRelationArgs>) {
  return renderHook(() =>
    useRelation({
      relation: {
        skip: false,
        params: {
          model: 'api::post.post',
          targetField: 'tags',
          id: '1',
        },
        onLoad: jest.fn(),
        normalizeArguments: {
          mainFieldName: 'name',
          shouldAddLink: false,
          targetModel: 'api::tag.tag',
        },
        ...(args?.relation ?? {}),
      },

      search: {
        searchParams: {
          model: 'api::post.post',
          targetField: 'tags',
        },
        pageParams: {
          limit: 10,
          ...(args?.search?.pageParams ?? {}),
        },
        ...(args?.search ?? {}),
      },
    })
  );
}

describe('useRelation', () => {
  test('fetch relations and calls onLoadRelationsCallback', async () => {
    const onLoadMock = jest.fn();
    const { result } = setup({
      // @ts-expect-error – doesn't want partial updates
      relation: {
        onLoad: onLoadMock,
      },
    });

    await waitFor(() => expect(result.current.relations.isSuccess).toBe(true));

    expect(result.current.relations.data).toMatchInlineSnapshot(`
      {
        "pagination": {
          "page": 1,
          "pageCount": 1,
          "total": 3,
        },
        "results": [
          {
            "id": 3,
            "name": "Relation entity 3",
          },
          {
            "id": 2,
            "name": "Relation entity 2",
          },
          {
            "id": 1,
            "name": "Relation entity 1",
          },
        ],
      }
    `);

    expect(onLoadMock.mock.calls[0][0]).toMatchInlineSnapshot(`
      [
        {
          "id": 3,
          "mainField": "Relation entity 3",
          "name": "Relation entity 3",
          "publicationState": false,
        },
        {
          "id": 2,
          "mainField": "Relation entity 2",
          "name": "Relation entity 2",
          "publicationState": false,
        },
        {
          "id": 1,
          "mainField": "Relation entity 1",
          "name": "Relation entity 1",
          "publicationState": false,
        },
      ]
    `);
  });

  test('fetch and normalize relations for xToOne', async () => {
    const onLoadMock = jest.fn();

    server.use(
      rest.get('/content-manager/relations/:contentType/:id/:fieldName', (req, res, ctx) => {
        return res(
          ctx.json({
            data: {
              id: 1,
              title: 'xToOne relation',
            },
          })
        );
      })
    );

    const { result } = setup({
      // @ts-expect-error – doesn't want partial updates
      relation: {
        onLoad: onLoadMock,
      },
    });

    await waitFor(() => expect(result.current.relations.isSuccess).toBe(true));

    await waitFor(() => expect(onLoadMock).toBeCalledWith([expect.objectContaining({ id: 1 })]));
  });

  test('fetch relations next page, if there is one', async () => {
    server.use(
      rest.get('/content-manager/relations/:contentType/:id/:fieldName', async (req, res, ctx) => {
        const page = parseInt(new URL(req.url).searchParams.get('page') ?? '1');

        if (page > 1) {
          return res(
            ctx.json({
              results: [
                {
                  id: 2,
                  name: 'Relation entity 2',
                },
              ],
              pagination: {
                page: 2,
                pageCount: 2,
                total: 2,
              },
            })
          );
        }

        return res(
          ctx.json({
            results: [
              {
                id: 1,
                name: 'Relation entity 1',
              },
            ],
            pagination: {
              page: 1,
              pageCount: 2,
              total: 2,
            },
          })
        );
      })
    );

    const { result } = setup();

    await waitFor(() => expect(result.current.relations.isSuccess).toBe(true));

    expect(result.current.relations.data).toMatchInlineSnapshot(`
      {
        "pagination": {
          "page": 1,
          "pageCount": 2,
          "total": 2,
        },
        "results": [
          {
            "id": 1,
            "name": "Relation entity 1",
          },
        ],
      }
    `);

    act(() => {
      result.current.relations.fetchNextPage();
    });

    await waitFor(() => expect(result.current.relations.isLoading).toBe(false));

    expect(result.current.relations.data).toMatchInlineSnapshot(`
      {
        "pagination": {
          "page": 2,
          "pageCount": 2,
          "total": 2,
        },
        "results": [
          {
            "id": 1,
            "name": "Relation entity 1",
          },
          {
            "id": 2,
            "name": "Relation entity 2",
          },
        ],
      }
    `);
  });

  test("does not fetch relations next page, if there isn't one", async () => {
    const { result } = setup();

    await waitFor(() => expect(result.current.relations.isSuccess).toBe(true));

    expect(result.current.relations.data?.pagination?.page).toBe(1);
    expect(result.current.relations.data?.pagination?.pageCount).toBe(1);

    act(() => {
      result.current.relations.fetchNextPage();
    });

    await waitFor(() => expect(result.current.relations.isSuccess).toBe(true));

    expect(result.current.relations.data?.pagination?.page).toBe(1);
    expect(result.current.relations.data?.pagination?.pageCount).toBe(1);
  });

  test('does not fetch search by default', async () => {
    const { result } = setup();

    await waitFor(() => expect(result.current.search.isLoading).toBe(false));
  });

  test('does fetch search results once a term was provided', async () => {
    const { result } = setup();

    await waitFor(() => expect(result.current.relations.isSuccess).toBe(true));

    expect(result.current.search.data).toBeUndefined();

    act(() => {
      result.current.searchFor('something');
    });

    await waitFor(() => expect(result.current.search.isLoading).toBe(false));

    expect(result.current.search.data).toMatchInlineSnapshot(`
      {
        "pagination": {
          "page": 1,
          "pageCount": 1,
          "total": 3,
        },
        "results": [
          {
            "id": 3,
            "name": "Relation entity 3",
          },
          {
            "id": 2,
            "name": "Relation entity 2",
          },
          {
            "id": 1,
            "name": "Relation entity 1",
          },
        ],
      }
    `);
  });
});
