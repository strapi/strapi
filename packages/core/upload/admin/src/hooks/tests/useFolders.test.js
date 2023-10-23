import { renderHook, waitFor, screen, server } from '@tests/utils';
import { rest } from 'msw';

import { useFolders } from '../useFolders';

describe('useFolders', () => {
  afterEach(() => {
    jest.clearAllMocks();
  });

  test('fetches data from the right URL if no query param was set', async () => {
    const { result } = renderHook(() => useFolders());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toMatchInlineSnapshot(`
      [
        {
          "children": {
            "count": 2,
          },
          "createdAt": "2023-06-26T12:48:54.054Z",
          "files": {
            "count": 0,
          },
          "id": 1,
          "name": "test",
          "path": "/1",
          "pathId": 1,
          "updatedAt": "2023-06-26T12:48:54.054Z",
        },
      ]
    `);
  });

  test('does not use parent filter in params if _q', async () => {
    const { result } = renderHook(() =>
      useFolders({
        query: { folder: 5, _q: 'something', filters: { $and: [{ something: 'true' }] } },
      })
    );

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toMatchInlineSnapshot(`
      [
        {
          "children": {
            "count": 2,
          },
          "createdAt": "2023-06-26T12:48:54.054Z",
          "files": {
            "count": 0,
          },
          "id": 1,
          "name": "something",
          "path": "/1",
          "pathId": 1,
          "updatedAt": "2023-06-26T12:48:54.054Z",
        },
      ]
    `);

    expect(result.current.data[0].name).toBe('something');
  });

  test('fetches data from the right URL if a query param was set', async () => {
    const { result } = renderHook(() => useFolders({ query: { folder: 1 } }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toMatchInlineSnapshot(`
      [
        {
          "children": {
            "count": 0,
          },
          "createdAt": "2023-06-26T12:49:31.354Z",
          "files": {
            "count": 3,
          },
          "id": 3,
          "name": "2022",
          "path": "/1/3",
          "pathId": 3,
          "updatedAt": "2023-06-26T12:49:31.354Z",
        },
        {
          "children": {
            "count": 0,
          },
          "createdAt": "2023-06-26T12:49:08.466Z",
          "files": {
            "count": 3,
          },
          "id": 2,
          "name": "2023",
          "path": "/1/2",
          "pathId": 2,
          "updatedAt": "2023-06-26T12:49:08.466Z",
        },
      ]
    `);

    result.current.data.forEach((folder) => {
      /**
       * We're passing a "current folder" in the query, which means
       * any folders returned should include the current folder's ID
       * in it's path because this get's the children of current.
       */
      expect(folder.path.includes('1')).toBe(true);
    });
  });

  test('it does not fetch, if enabled is set to false', async () => {
    const { result } = renderHook(() => useFolders({ enabled: false }));

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    expect(result.current.data).toBe(undefined);
  });

  test('calls toggleNotification in case of error', async () => {
    const originalConsoleError = console.error;
    console.error = jest.fn();

    server.use(rest.get('/upload/folders', (req, res, ctx) => res(ctx.status(500))));

    const { result } = renderHook(() => useFolders());

    await waitFor(() => expect(result.current.isLoading).toBe(false));

    await waitFor(() => expect(screen.getByText('notification.error')).toBeInTheDocument());

    console.error = originalConsoleError;
    server.restoreHandlers();
  });
});
